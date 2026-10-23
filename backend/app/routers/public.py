"""API для сайта: /api/…"""
from __future__ import annotations

import html
import json
import logging
import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..catalog import DELIVERY, catalog
from ..config import settings
from ..db import get_db
from ..models import Order, Payment, VinLearned
from ..notify import notify_customer, notify_managers
from ..payments import PaymentError, get_provider
from ..payments.yookassa import is_yookassa_ip
from ..schemas import OrderIn, RequestIn
from ..security import check_origin, client_ip, rate_limit, spam_score, verify_captcha
from ..services import OrderError, apply_provider_payment, create_order, create_request, learned_for, public_status, start_payment
from ..vin import vin_base

log = logging.getLogger("avtostil.api")
router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/config")
def public_config():
    """Настройки для страниц: предоплата, включена ли онлайн-оплата, ключ капчи."""
    return {"prepay": settings.prepay_amount, "online": settings.payments_online,
            "captcha": settings.smartcaptcha_client_key or None,
            "delivery": {k: v[1] for k, v in DELIVERY.items()}}


@router.post("/orders")
async def post_order(data: OrderIn, request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    check_origin(request)
    rate_limit(request, "order")
    if not await verify_captcha(data.meta.captcha, client_ip(request)):
        raise HTTPException(400, detail="Подтвердите, что вы не робот")
    spam = spam_score(data.meta.hp, data.meta.elapsed_ms)
    try:
        order, pay_url = await create_order(db, data, request, spam)
    except OrderError as e:
        raise HTTPException(422, detail=str(e))
    if spam < 10:
        bg.add_task(notify_managers, order.id)
        bg.add_task(notify_customer, order.id)
    return {"number": order.number, "order": order.public_id, "payment_url": pay_url,
            "redirect": f"thanks.html?order={order.public_id}", "status": public_status(order)}


@router.get("/orders/{public_id}")
async def get_order_status(public_id: str, request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    """Статус для страницы «Спасибо». Клиент вернулся с ЮKassa раньше уведомления — сверяем последний платёж сами."""
    rate_limit(request, "status")
    order = _order_by_public(db, public_id)
    last = order.payments[-1] if order.payments else None
    if last and last.status in ("pending", "waiting_for_capture") and last.provider_payment_id and last.provider == settings.payment_provider:
        try:
            pp = await get_provider().fetch(last.provider_payment_id)
            if apply_provider_payment(db, last, pp) and pp.status == "succeeded":
                bg.add_task(notify_managers, order.id, f"Оплата {last.amount_kop // 100} ₽ по заказу {order.number}")
        except PaymentError as e:
            log.warning("заказ %s: статус платежа не получен: %s", order.number, e)
    return JSONResponse(public_status(order), headers={"Cache-Control": "no-store"})


@router.post("/orders/{public_id}/pay")
async def pay_again(public_id: str, request: Request, db: Session = Depends(get_db)):
    """Повторная попытка оплаты со страницы «Спасибо» (если клиент закрыл страницу ЮKassa или оплата не прошла)."""
    check_origin(request)
    rate_limit(request, "pay")
    order = _order_by_public(db, public_id)
    st = public_status(order)
    if not st["can_pay"]:
        raise HTTPException(409, detail="Заказ уже оплачен или оплата онлайн недоступна")
    # если есть живой неоплаченный платёж — отдаём его ссылку, не плодим новые
    for p in reversed(order.payments):
        if p.status == "pending" and p.confirmation_url and p.purpose in ("prepay", "full"):
            return {"payment_url": p.confirmation_url}
    try:
        p = await start_payment(db, order, "prepay" if order.pay_scheme == "prepay" else "full", order.due_now_kop - order.paid_kop)
    except PaymentError as e:
        log.error("заказ %s: повторный платёж не создан: %s", order.number, e)
        raise HTTPException(502, detail="Платёжная система не отвечает. Попробуйте позже или позвоните 8 (800) 775-32-60.")
    return {"payment_url": p.confirmation_url}


@router.post("/requests")
async def post_request(data: RequestIn, request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    check_origin(request)
    rate_limit(request, "request")
    if not await verify_captcha(data.meta.captcha, client_ip(request)):
        raise HTTPException(400, detail="Подтвердите, что вы не робот")
    spam = spam_score(data.meta.hp, data.meta.elapsed_ms)
    order = create_request(db, data, request, spam)
    if spam < 10:
        bg.add_task(notify_managers, order.id)
    return {"number": order.number}


@router.get("/vin")
def vin_decode(request: Request, q: str = Query(..., min_length=2, max_length=40), model: str = "", db: Session = Depends(get_db)):
    """Расшифровка VIN / номера кузова. С model=<лекало> — ещё и сверка с выбранным лекалом."""
    rate_limit(request, "vin")
    learned = learned_for(db, q)
    if model:
        state, d = vin_base.check(model, q, learned)
        d["check"] = state
    else:
        d = vin_base.decode(q, learned)
    if d.get("vehicle"):
        d["vehicle"].pop("sources", None)
    return JSONResponse(d, headers={"Cache-Control": "no-store"})


@router.get("/vin/suggest")
def vin_suggest(request: Request, q: str = Query(..., min_length=1, max_length=40), brand: str = Query("", max_length=40),
                db: Session = Depends(get_db)):
    """Подсказки при вводе VIN или номера кузова: какие автомобили каталога подходят под уже введённые символы."""
    rate_limit(request, "suggest")
    key = re.sub(r"[^A-Z0-9]", "", q.upper())[:8]
    learned = []
    if len(key) >= 3:  # сверенные менеджерами VIN с таким началом
        rows = db.scalars(select(VinLearned).where(VinLearned.key.like(key + "%")).limit(50)).all()
        learned = [{"key": r.key, "slug": r.slug, "years": r.years or [], "hits": r.hits} for r in rows]
    learned += learned_for(db, q)
    res = vin_base.suggest(q, learned, brand=brand if brand in catalog.brands else "")
    return JSONResponse(res, headers={"Cache-Control": "no-store"})


# ---------- ЮKassa: входящие уведомления ----------
@router.post("/payments/yookassa/webhook")
async def yookassa_webhook(request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    ip = client_ip(request)
    rate_limit(request, "webhook")
    if settings.yookassa_check_ip and not is_yookassa_ip(ip):
        log.warning("уведомление ЮKassa с чужого адреса %s отклонено", ip)
        raise HTTPException(403)
    if settings.payment_provider != "yookassa":
        raise HTTPException(404)
    try:
        body = json.loads(await request.body())
        obj = body.get("object") or {}
        event, pid = body.get("event", ""), obj.get("id") if not body.get("event", "").startswith("refund.") else obj.get("payment_id")
    except (ValueError, AttributeError):
        raise HTTPException(400)
    if not pid:
        raise HTTPException(400)
    pay = db.scalar(select(Payment).where(Payment.provider_payment_id == pid))
    if not pay:
        log.warning("уведомление %s по неизвестному платежу %s", event, pid)
        return {"ok": True}  # 200, иначе ЮKassa будет повторять сутки
    try:
        pp = await get_provider().fetch(pid)   # доверяем только ответу API, не телу уведомления
    except PaymentError as e:
        log.error("не удалось проверить платёж %s: %s", pid, e)
        raise HTTPException(503)               # ЮKassa повторит уведомление позже
    if apply_provider_payment(db, pay, pp) and pp.status == "succeeded":
        bg.add_task(notify_managers, pay.order_id, f"Оплата {pay.amount_kop // 100} ₽ по заказу {pay.order.number}")
    return {"ok": True}


# ---------- тестовая касса (только разработка) ----------
MOCK_PAGE = """<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Тестовая оплата</title><style>body{{font:16px/1.5 system-ui,sans-serif;background:#eae9e6;color:#231f20;display:grid;place-items:center;min-height:100vh;margin:0}}
.box{{background:#fff;border-radius:16px;padding:32px;max-width:420px;width:calc(100% - 32px);box-shadow:0 10px 40px rgba(0,0,0,.08)}}
h1{{font-size:20px;margin:0 0 6px}}.sum{{font-size:32px;font-weight:650;margin:16px 0}}.muted{{color:#6b6e74;font-size:14px}}
button{{font:inherit;border:0;border-radius:10px;padding:14px 18px;width:100%;margin-top:10px;cursor:pointer}}
.ok{{background:#ffdf40;color:#231f20;font-weight:600}}.no{{background:#f1f1ef}}.warn{{background:#fff4c2;border-radius:10px;padding:10px 12px;font-size:14px}}</style></head>
<body><form class="box" method="post"><div class="warn">Тестовая касса — деньги не списываются. В проде здесь страница ЮKassa.</div>
<h1>{desc}</h1><div class="sum">{amount} ₽</div><div class="muted">Платёж {pid}</div>
<button class="ok" name="result" value="success">Оплатить</button><button class="no" name="result" value="cancel">Отменить оплату</button></form></body></html>"""


@router.get("/payments/mock/{pid}", response_class=HTMLResponse)
def mock_page(pid: str):
    if settings.payment_provider != "mock":
        raise HTTPException(404)
    from ..payments.mock import mock_get
    p = mock_get(pid)
    if not p:
        raise HTTPException(404, detail="Тестовый платёж не найден")
    return HTMLResponse(MOCK_PAGE.format(desc=html.escape(p.raw["description"]), amount=f"{p.amount_kop // 100:,}".replace(",", " "), pid=html.escape(pid)))


@router.post("/payments/mock/{pid}")
async def mock_submit(pid: str, request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if settings.payment_provider != "mock":
        raise HTTPException(404)
    from ..payments.mock import mock_finish, mock_get
    if not mock_get(pid):
        raise HTTPException(404)
    form = await request.form()
    p = mock_finish(pid, form.get("result") == "success")
    pay = db.scalar(select(Payment).where(Payment.provider_payment_id == pid))
    if pay:  # то же, что делает уведомление ЮKassa
        if apply_provider_payment(db, pay, p) and p.status == "succeeded":
            bg.add_task(notify_managers, pay.order_id, f"Оплата {pay.amount_kop // 100} ₽ по заказу {pay.order.number}")
    return RedirectResponse(p.raw["return_url"], status_code=303)


def _order_by_public(db: Session, public_id: str) -> Order:
    if not (16 <= len(public_id) <= 40) or not public_id.isalnum():
        raise HTTPException(404)
    order = db.scalar(select(Order).where(Order.public_id == public_id))
    if not order:
        raise HTTPException(404, detail="Заказ не найден")
    return order
