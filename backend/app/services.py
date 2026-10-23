"""Логика заказов, заявок и оплат — общая для сайта и админки."""
from __future__ import annotations

import logging
import uuid
from typing import List, Optional, Tuple

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .catalog import CUSTOM_MAT_IDX, DEFAULT_PRICES, DELIVERY, catalog
from .config import settings
from .models import Order, OrderEvent, OrderItem, Payment, VinLearned, utcnow
from .payments import PaymentError, ProviderPayment, get_provider
from .payments.base import PaymentRequest, ReceiptLine, split_amount
from .schemas import OrderIn, RequestIn
from .security import client_ip
from .vin import vin_base

log = logging.getLogger("avtostil.orders")
CONSENT_DOC = "privacy.html + offer.html"


class OrderError(Exception):
    pass


def _event(order: Order, typ: str, text: str, actor: str = "system", data: Optional[dict] = None) -> None:
    order.events.append(OrderEvent(type=typ, text=text, actor=actor, data=data))


def _assign_number(db: Session, order: Order) -> None:
    db.flush()
    order.number = f"AS-{settings.order_number_start + order.id - 1}"


def _request_meta(order: Order, meta, request: Request) -> None:
    order.source_page = meta.page
    order.referrer = meta.referrer
    order.utm = meta.utm or None
    order.ip = client_ip(request)
    order.user_agent = (request.headers.get("user-agent") or "")[:300]
    order.consent_at = utcnow()
    order.consent_doc = CONSENT_DOC


# ---------- VIN ----------
def learned_for(db: Session, raw: str) -> List[dict]:
    kind, value, _ = vin_base.classify(raw)
    if kind == "invalid":
        return []
    key = "FRAME:" + value if kind == "frame" else value[:8]
    rows = db.scalars(select(VinLearned).where(VinLearned.key == key)).all()
    return [{"key": r.key, "slug": r.slug, "years": r.years or [], "hits": r.hits} for r in rows]


def vin_summary(d: dict) -> dict:
    """Расшифровка для карточки заказа — без лишнего."""
    w = d.get("wmi") or {}
    return {"kind": d["kind"], "vin": d.get("vin") or d.get("frame_code"), "wmi": w.get("code", ""),
            "maker": w.get("maker", ""), "brands": w.get("brand_names", []), "country": d.get("country", ""),
            "year": d.get("year"), "vehicle": d.get("vehicle"), "matches": [m["slug"] for m in d.get("matches", [])],
            "level": d.get("level"), "problems": d.get("problems", []), "message": d.get("message", "")}


def apply_vin(db: Session, order: Order, raw: str, slug: str) -> None:
    order.vin = raw[:24]
    if not raw:
        order.vin_state, order.vin_info = "", None
        return
    state, d = vin_base.check(slug, raw, learned_for(db, raw)) if slug else ("unknown", vin_base.decode(raw, learned_for(db, raw)))
    order.vin_state, order.vin_info = state, vin_summary(d)


def learn_vin(db: Session, order: Order, slug: str, actor: str) -> str:
    """Менеджер подтвердил лекало для VIN заказа → запоминаем начало VIN (или код кузова) для следующих клиентов."""
    if slug not in catalog.models:
        raise OrderError("Нет такого лекала в каталоге")
    kind, value, _ = vin_base.classify(order.vin)
    if kind == "invalid":
        raise OrderError("В заказе нет VIN или номера кузова")
    key = "FRAME:" + value if kind == "frame" else value[:8]
    if kind != "frame" and len(value) < 8:
        raise OrderError("Для запоминания нужны хотя бы первые 8 символов VIN")
    year = vin_base.model_year(value, (vin_base.wmi.get(value[:3]) or {}))[0] if kind != "frame" else None
    row = db.scalar(select(VinLearned).where(VinLearned.key == key, VinLearned.slug == slug))
    if row:
        if order.vin_confirmed_slug != slug:
            row.hits += 1
        yrs = set(row.years or [])
        if year:
            yrs.add(year)
        row.years = sorted(yrs)
    else:
        db.add(VinLearned(key=key, slug=slug, years=[year] if year else [], example=value[:11], order_id=order.id, created_by=actor))
    order.vin_confirmed_slug = slug
    order.vin_state = "ok"
    m = catalog.models[slug]
    _event(order, "vin", f"VIN сверен: {catalog.car_name(m)}{' (' + m.v + ')' if m.v else ''}. Запомнили {key.replace('FRAME:', 'кузов ')} для следующих клиентов", actor)
    return key


# ---------- заказ ----------
def _custom_item(it) -> OrderItem:
    """Комплект из конструктора: цену считаем сами по лекалу и выбору (catalog.custom_quote), описание для менеджера — из корзины."""
    slug = it.id.split(":")[1]
    m = catalog.models.get(slug)
    if not m:
        raise OrderError("В корзине есть комплект на автомобиль, которого больше нет в каталоге. Соберите его в конструкторе заново.")
    try:
        q = catalog.custom_quote(m, it.config)
    except ValueError as er:
        raise OrderError(f"Комплект из конструктора: {er}. Соберите его заново.")
    price = q["price"] * 100
    label = (it.label or f"Индивидуальный пошив: {q['material'].lower()}, {q['design']}")[:160]
    color = str(it.config.get("ins_name") or "")[:120]
    return OrderItem(
        key=it.id, title=f"Индивидуальный пошив: чехлы на {catalog.car_name(m)}", brand_id=m.b, brand=catalog.brand_name(m.b), model=m.m,
        generation=m.g, salon=m.v, years=m.y, slug=m.s, variant_id="custom", material=q["material"], color=color, variant_name=label,
        options={"mats": q["mats"], "install": q["install"], "custom": dict(it.config), "paid": q["paid"]},
        qty=it.qty, price_kop=price, old_price_kop=0, sum_kop=price * it.qty)


def build_items(data: OrderIn) -> Tuple[List[OrderItem], int, dict]:
    items, total = [], 0
    extras = {"mats": data.extras.mats, "install": data.extras.install}
    for it in data.items:
        if it.id.startswith("custom:"):
            item = _custom_item(it)
            extras["mats"] = extras["mats"] or item.options["mats"]
            extras["install"] = extras["install"] or item.options["install"]
            items.append(item)
            total += item.sum_kop
            continue
        _, slug, vid, *flags = it.id.split(":")
        m, v = catalog.models.get(slug), catalog.variants.get(vid)
        if not m or not v:
            raise OrderError("В корзине есть позиция, которой больше нет в каталоге. Обновите страницу корзины.")
        price = catalog.price(m, v) * 100
        opts = {"mats": "mats" in flags, "install": "install" in flags}
        extras["mats"] = extras["mats"] or opts["mats"]
        extras["install"] = extras["install"] or opts["install"]
        items.append(OrderItem(
            key=it.id, title=f"Чехлы на {catalog.car_name(m)}", brand_id=m.b, brand=catalog.brand_name(m.b), model=m.m,
            generation=m.g, salon=m.v, years=m.y, slug=m.s, variant_id=v.id, material=v.material, color=v.label,
            variant_name=v.name, options=opts, qty=it.qty, price_kop=price, old_price_kop=catalog.old_price(m, v) * 100,
            sum_kop=price * it.qty))
        total += price * it.qty
    extras["gift"] = "Оплётка руля в цвет салона"
    return items, total, extras


async def create_order(db: Session, data: OrderIn, request: Request, spam: int) -> Tuple[Order, Optional[str]]:
    items, items_kop, extras = build_items(data)
    title, delivery_rub = DELIVERY[data.delivery]
    order = Order(kind="order", public_id=uuid.uuid4().hex, status="spam" if spam >= 10 else "new", spam_score=spam,
                  name=data.customer.name, phone=data.customer.phone, email=data.customer.email, city=data.customer.city,
                  contact_method=data.customer.contact, company=data.company if data.payment == "invoice" else "",
                  inn=data.inn if data.payment == "invoice" else "", delivery_method=data.delivery, delivery_title=title,
                  delivery_address=data.address, delivery_kop=None if delivery_rub is None else delivery_rub * 100,
                  pay_scheme=data.payment, items_kop=items_kop, extras=extras, comment=data.comment)
    order.items = items
    order.total_kop = items_kop + (order.delivery_kop or 0)
    first = items[0]
    order.car_slug = first.slug
    order.car_title = catalog.car_name(catalog.models[first.slug]) + (f" и ещё {len(items) - 1}" if len(items) > 1 else "")
    _request_meta(order, data.meta, request)
    if data.payment == "prepay":
        order.due_now_kop = min(settings.prepay_amount * 100, order.total_kop)
    elif data.payment == "full":
        order.due_now_kop = order.total_kop
    order.pay_status = "invoice" if data.payment == "invoice" else "pending"
    apply_vin(db, order, data.vin, first.slug)
    db.add(order)
    _assign_number(db, order)
    _event(order, "created", f"Заказ с сайта: {len(items)} поз. на {order.total_kop // 100} ₽, оплата — {data.payment}", "customer")
    db.commit()

    pay_url = None
    if order.due_now_kop and settings.payments_online and spam < 10:
        try:
            p = await start_payment(db, order, "prepay" if data.payment == "prepay" else "full", order.due_now_kop)
            pay_url = p.confirmation_url or None
        except PaymentError as e:
            log.error("заказ %s: платёж не создан: %s", order.number, e)
            _event(order, "payment", f"Не удалось создать платёж: {e}. Клиент может оплатить позже со страницы заказа.")
            db.commit()
    return order, pay_url


def _receipt(order: Order, purpose: str, amount_kop: int) -> List[ReceiptLine]:
    mode = "full_prepayment" if purpose == "full" else settings.yookassa_prepay_mode
    lines = [(f"{it.title}, {it.variant_name.lower()}", it.qty, it.sum_kop, "commodity") for it in order.items]
    if order.delivery_kop and purpose == "full":
        lines.append((order.delivery_title, 1, order.delivery_kop, "service"))
    if purpose != "full":
        parts = split_amount(amount_kop, [ln[2] for ln in lines])
        lines = [(d, q, part, s) for (d, q, _, s), part in zip(lines, parts) if part > 0]
    return [ReceiptLine(description=d, quantity=q, amount_kop=a, payment_mode=mode, payment_subject=s) for d, q, a, s in lines]


async def start_payment(db: Session, order: Order, purpose: str, amount_kop: int, actor: str = "customer") -> Payment:
    if amount_kop <= 0:
        raise PaymentError("Сумма к оплате — ноль")
    provider = get_provider()
    pay = Payment(public_id=uuid.uuid4().hex, provider=provider.name, purpose=purpose, amount_kop=amount_kop,
                  status="new", idempotence_key=uuid.uuid4().hex, created_by=actor)
    order.payments.append(pay)
    db.flush()
    what = {"prepay": "Предоплата", "full": "Оплата", "rest": "Доплата", "manual": "Оплата"}[purpose]
    req = PaymentRequest(
        amount_kop=amount_kop, description=f"{what} по заказу {order.number} — авточехлы «Автостиль»",
        return_url=f"{settings.site_url}/thanks.html?order={order.public_id}", idempotence_key=pay.idempotence_key,
        metadata={"order": order.number, "order_id": str(order.id), "payment": pay.public_id},
        customer_email=order.email, customer_phone=order.phone, receipt=_receipt(order, purpose, amount_kop))
    try:
        pp = await provider.create(req)
    except PaymentError as e:
        pay.status = "error"
        pay.cancel_reason = str(e)[:120]
        db.commit()
        raise
    pay.provider_payment_id, pay.status, pay.confirmation_url, pay.raw = pp.id, pp.status, pp.confirmation_url, _safe_raw(pp.raw)
    if order.pay_status in ("canceled", "not_required"):
        order.pay_status = "pending"
    _event(order, "payment", f"Создан платёж {pay.public_id[:8]} на {amount_kop // 100} ₽ ({provider.name})", actor)
    db.commit()
    return pay


def _safe_raw(raw: Optional[dict]) -> Optional[dict]:
    """В базе храним ответ провайдера без данных карты (у ЮKassa там только маска, но всё равно режем)."""
    if not raw:
        return None
    keep = ("id", "status", "paid", "amount", "income_amount", "refunded_amount", "created_at", "captured_at",
            "cancellation_details", "test", "metadata", "description")
    out = {k: raw[k] for k in keep if k in raw}
    pm = raw.get("payment_method") or {}
    out["payment_method"] = {"type": pm.get("type"), "title": pm.get("title")}
    return out


def recalc_paid(order: Order) -> None:
    paid = 0
    for p in order.payments:
        if p.status == "succeeded":
            refunded = 0
            ra = (p.raw or {}).get("refunded_amount")
            if ra:
                r, _, k = str(ra.get("value", "0")).partition(".")
                refunded = int(r) * 100 + int((k + "00")[:2])
            paid += p.amount_kop - refunded
    order.paid_kop = max(0, paid)
    if order.paid_kop >= order.total_kop > 0:
        order.pay_status = "paid"
    elif order.paid_kop > 0:
        order.pay_status = "partially_paid"
    elif any(p.status == "succeeded" for p in order.payments):
        order.pay_status = "refunded"
    elif order.pay_scheme == "invoice":
        order.pay_status = "invoice"
    elif order.payments and all(p.status in ("canceled", "error") for p in order.payments):
        order.pay_status = "canceled"
    else:
        order.pay_status = "pending"


def apply_provider_payment(db: Session, pay: Payment, pp: ProviderPayment, actor: str = "system") -> bool:
    """Обновляет платёж по данным провайдера. Повторные уведомления безопасны. → True, если статус изменился."""
    if pp.amount_kop and pp.amount_kop != pay.amount_kop:
        log.error("платёж %s: сумма у провайдера %s ≠ %s — не применяем", pay.public_id, pp.amount_kop, pay.amount_kop)
        _event(pay.order, "payment", f"Сумма платежа у провайдера ({pp.amount_kop // 100} ₽) не совпала с заказом — проверьте вручную")
        db.commit()
        return False
    before = (pay.status, (pay.raw or {}).get("refunded_amount"))
    pay.status = pp.status
    pay.method = pp.method or pay.method
    pay.cancel_reason = pp.cancel_reason
    pay.raw = _safe_raw(pp.raw) or pay.raw
    if pp.status == "succeeded" and not pay.paid_at:
        pay.paid_at = utcnow()
    changed = before != (pay.status, (pay.raw or {}).get("refunded_amount"))
    if changed:
        order = pay.order
        recalc_paid(order)
        text = {"succeeded": f"Оплата {pay.amount_kop // 100} ₽ получена", "canceled": f"Платёж отменён ({pp.cancel_reason or 'без причины'})",
                "waiting_for_capture": "Платёж ждёт подтверждения"}.get(pp.status, f"Статус платежа: {pp.status}")
        _event(order, "payment", text, actor, {"payment": pay.public_id, "provider_id": pay.provider_payment_id})
    db.commit()
    return changed


# ---------- заявки ----------
CONTACT = {"Позвонить": "call", "WhatsApp": "whatsapp", "Telegram": "telegram", "MAX": "max"}


def create_request(db: Session, data: RequestIn, request: Request, spam: int) -> Order:
    order = Order(kind=data.kind, public_id=uuid.uuid4().hex, status="spam" if spam >= 10 else "new", spam_score=spam,
                  name=data.name, phone=data.phone, email=data.email, city=data.city, contact_method=data.contact_method,
                  topic=data.topic, message=data.message, car_title=data.car, pay_scheme="none", pay_status="not_required")
    m = catalog.models.get(data.model) if data.model else None
    if data.kind == "custom":
        idx = CUSTOM_MAT_IDX.get(str(data.config.get("mat", "")), None)
        price = (m.p if m else DEFAULT_PRICES)[idx] if idx is not None else min(m.p if m else DEFAULT_PRICES)
        order.config = {"choice": data.config, "summary": data.summary, "price_from": price}
        order.total_kop = price * 100
        order.extras = {"mats": "mats" in (data.config.get("opts") or []), "install": "install" in (data.config.get("opts") or [])}
    if m:
        order.car_slug, order.car_title = m.s, catalog.car_name(m) + (f" ({m.v})" if m.v else "")
    _request_meta(order, data.meta, request)
    apply_vin(db, order, data.vin, m.s if m else "")
    db.add(order)
    _assign_number(db, order)
    _event(order, "created", f"{order.kind_title} с сайта", "customer")
    db.commit()
    return order


def public_status(order: Order) -> dict:
    last = order.payments[-1] if order.payments else None
    return {
        "number": order.number, "kind": order.kind, "status": order.status_title, "pay_scheme": order.pay_scheme,
        "pay_status": order.pay_status, "total": order.total_kop // 100, "paid": order.paid_kop // 100,
        "due_now": order.due_now_kop // 100, "delivery_by_tariff": order.delivery_kop is None and order.is_order,
        "can_pay": bool(order.is_order and settings.payments_online and order.due_now_kop and order.paid_kop < order.due_now_kop
                        and order.status != "canceled"),
        "last_payment": last.status if last else None,
    }
