"""Админка /admin: заказы и заявки, оплаты, сверка VIN, пользователи.
Вход: логин + пароль (scrypt) + код из приложения (TOTP, если включён). Сессии на сервере, cookie HttpOnly + SameSite=Strict,
CSRF-токен в каждой форме, блокировка после 5 неудачных попыток, лимит попыток по IP."""
from __future__ import annotations

import csv
import datetime as dt
import io
import math
import pathlib
import re
import uuid
import zoneinfo
from typing import Optional
from urllib.parse import quote, urlencode

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..catalog import catalog
from ..config import settings
from ..db import get_db
from ..models import (KINDS, PAY_SCHEMES, PAY_STATUSES, REQUEST_STATUSES, STATUSES, AdminSession, AdminUser, Order,
                      OrderEvent, Payment, VinLearned, utcnow)
from ..notify import rub
from ..payments import PaymentError
from ..security import (DUMMY_HASH, _in_networks, client_ip, hash_password, new_token, password_problems, rate_limit,
                        token_hash, totp_new_secret, totp_uri, totp_verify, verify_password)
from ..services import OrderError, learn_vin, learned_for, recalc_paid, start_payment
from ..vin import vin_base

router = APIRouter(prefix="/admin")
templates = Jinja2Templates(directory=str(pathlib.Path(__file__).resolve().parent.parent / "templates"))
COOKIE = "as_admin"
SESSION_HOURS = 12
TZ = zoneinfo.ZoneInfo("Asia/Novosibirsk")


def local(t: Optional[dt.datetime], fmt: str = "%d.%m.%Y %H:%M") -> str:
    return t.replace(tzinfo=dt.timezone.utc).astimezone(TZ).strftime(fmt) if t else ""


templates.env.filters["rub"] = lambda k: rub(k or 0)
templates.env.filters["local"] = local
templates.env.globals.update(KINDS=KINDS, STATUSES=STATUSES, REQUEST_STATUSES=REQUEST_STATUSES, PAY_SCHEMES=PAY_SCHEMES,
                             PAY_STATUSES=PAY_STATUSES, catalog=catalog, site_url=settings.site_url)


class LoginRequired(Exception):
    pass


# ---------- доступ ----------
def _ip_allowed(request: Request) -> None:
    if settings.admin_ip_allowlist and not _in_networks(client_ip(request), settings.admin_ip_allowlist):
        raise HTTPException(404)


def current(request: Request, db: Session = Depends(get_db)) -> AdminSession:
    _ip_allowed(request)
    tok = request.cookies.get(COOKIE)
    if not tok:
        raise LoginRequired()
    s = db.scalar(select(AdminSession).where(AdminSession.token_hash == token_hash(tok)))
    now = utcnow()
    if not s or s.expires_at < now or not s.user.is_active:
        raise LoginRequired()
    if (now - s.last_seen_at).total_seconds() > 60:
        s.last_seen_at = now
        db.commit()
    request.state.admin = s
    return s


def require_admin(s: AdminSession = Depends(current)) -> AdminSession:
    if s.user.role != "admin":
        raise HTTPException(403, detail="Только для администратора")
    return s


def check_csrf(request: Request, s: AdminSession, token: str) -> None:
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in ({settings.site_url} | {o.rstrip("/") for o in settings.allowed_origins}) \
            and not (not settings.is_production and origin.startswith(("http://127.0.0.1", "http://localhost"))):
        raise HTTPException(403, detail="Чужой источник запроса")
    if not token or token != s.csrf:
        raise HTTPException(403, detail="Форма устарела — обновите страницу")


def render(request: Request, name: str, ctx: dict, status: int = 200) -> HTMLResponse:
    s = getattr(request.state, "admin", None)
    ctx.update(request=request, me=s.user if s else None, csrf=s.csrf if s else "", flash=request.query_params.get("msg", ""),
               err=request.query_params.get("err", ""))
    return templates.TemplateResponse(request, name, ctx, status_code=status)


def back(url: str, msg: str = "", err: str = "") -> RedirectResponse:
    q = urlencode({k: v for k, v in (("msg", msg), ("err", err)) if v})
    return RedirectResponse(url + ("&" if "?" in url else "?") + q if q else url, status_code=303)


# ---------- вход ----------
@router.get("/login", response_class=HTMLResponse)
def login_form(request: Request, next: str = "/admin/orders"):
    _ip_allowed(request)
    return render(request, "admin/login.html", {"next": next if next.startswith("/admin") else "/admin/orders"})


@router.post("/login")
def login(request: Request, username: str = Form(""), password: str = Form(""), code: str = Form(""),
          next: str = Form("/admin/orders"), db: Session = Depends(get_db)):
    _ip_allowed(request)
    rate_limit(request, "login")
    user = db.scalar(select(AdminUser).where(func.lower(AdminUser.username) == username.strip().lower()))
    now = utcnow()
    fail = lambda text: render(request, "admin/login.html", {"next": next, "error": text, "username": username}, 401)
    if not user:
        verify_password(password, DUMMY_HASH)
        return fail("Неверный логин или пароль")
    if user.locked_until and user.locked_until > now:
        return fail(f"Вход заблокирован до {local(user.locked_until, '%H:%M')} после неудачных попыток")
    if not user.is_active or not verify_password(password, user.password_hash) or (user.totp_secret and not totp_verify(user.totp_secret, code)):
        user.failed_logins += 1
        if user.failed_logins >= 5:
            user.locked_until, user.failed_logins = now + dt.timedelta(minutes=15), 0
        db.commit()
        return fail("Неверный логин, пароль или код из приложения" if user.totp_secret else "Неверный логин или пароль")
    user.failed_logins, user.locked_until, user.last_login_at = 0, None, now
    tok = new_token(32)
    db.add(AdminSession(token_hash=token_hash(tok), user_id=user.id, csrf=new_token(24), expires_at=now + dt.timedelta(hours=SESSION_HOURS),
                        ip=client_ip(request), user_agent=(request.headers.get("user-agent") or "")[:300]))
    db.execute(AdminSession.__table__.delete().where(AdminSession.expires_at < now))
    db.commit()
    resp = RedirectResponse(next if next.startswith("/admin") else "/admin/orders", status_code=303)
    resp.set_cookie(COOKIE, tok, max_age=SESSION_HOURS * 3600, httponly=True, secure=settings.site_url.startswith("https"),
                    samesite="strict", path="/admin")
    return resp


@router.post("/logout")
def logout(request: Request, csrf: str = Form(""), s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    db.delete(s)
    db.commit()
    resp = RedirectResponse("/admin/login", status_code=303)
    resp.delete_cookie(COOKIE, path="/admin")
    return resp


@router.get("")
@router.get("/")
def admin_root(s: AdminSession = Depends(current)):
    return RedirectResponse("/admin/orders", status_code=303)


# ---------- список ----------
def _filtered(db: Session, tab: str, status: str, pay: str, q: str, date_from: str, date_to: str):
    st = select(Order)
    if tab == "orders":
        st = st.where(Order.kind == "order")
    elif tab == "requests":
        st = st.where(Order.kind != "order", Order.status != "spam")
    elif tab == "spam":
        st = st.where(Order.status == "spam")
    elif tab in KINDS:
        st = st.where(Order.kind == tab)
    if tab != "spam" and status != "spam":
        st = st.where(Order.status != "spam")
    if status:
        st = st.where(Order.status == status)
    if pay:
        st = st.where(Order.pay_status == pay)
    q = q.strip()
    if q:
        like = f"%{q}%"
        digits = re.sub(r"\D", "", q)
        conds = [Order.number.ilike(like), Order.name.ilike(like), Order.email.ilike(like), Order.vin.ilike(like.upper()),
                 Order.car_title.ilike(like), Order.inn == digits]
        if len(digits) >= 4:
            # телефон хранится как «+7 (913) 123-45-67» — ищем по последним цифрам в любом формате
            tail = digits[-4:]
            conds.append(Order.phone.ilike(f"%{tail[:2]}-{tail[2:]}%"))
            conds.append(Order.phone.ilike(f"%{digits}%"))
        st = st.where(or_(*conds))
    for val, op in ((date_from, ">="), (date_to, "<")):
        try:
            d = dt.datetime.strptime(val, "%Y-%m-%d").replace(tzinfo=TZ).astimezone(dt.timezone.utc).replace(tzinfo=None)
            st = st.where(Order.created_at >= d if op == ">=" else Order.created_at < d + dt.timedelta(days=1))
        except ValueError:
            pass
    return st


@router.get("/orders", response_class=HTMLResponse)
def orders(request: Request, tab: str = "all", status: str = "", pay: str = "", q: str = "", date_from: str = "", date_to: str = "",
           page: int = 1, s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    st = _filtered(db, tab, status, pay, q, date_from, date_to)
    total = db.scalar(select(func.count()).select_from(st.subquery()))
    per = 50
    page = max(1, min(page, max(1, math.ceil(total / per))))
    rows = db.scalars(st.order_by(Order.created_at.desc()).offset((page - 1) * per).limit(per)).all()
    counts = dict(db.execute(select(Order.kind, func.count()).where(Order.status == "new").group_by(Order.kind)).all())
    params = {k: v for k, v in dict(tab=tab, status=status, pay=pay, q=q, date_from=date_from, date_to=date_to).items() if v}
    return render(request, "admin/orders.html", {
        "rows": rows, "total": total, "page": page, "pages": max(1, math.ceil(total / per)), "tab": tab, "status": status,
        "pay": pay, "q": q, "date_from": date_from, "date_to": date_to, "params": params,
        "new_orders": counts.get("order", 0), "new_requests": sum(v for k, v in counts.items() if k != "order"),
        "query": urlencode(params)})


@router.get("/orders.csv")
def orders_csv(tab: str = "all", status: str = "", pay: str = "", q: str = "", date_from: str = "", date_to: str = "",
               s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    rows = db.scalars(_filtered(db, tab, status, pay, q, date_from, date_to).order_by(Order.created_at.desc()).limit(20000)).all()
    buf = io.StringIO()
    raw = csv.writer(buf, delimiter=";")

    class _Safe:  # текст из формы, начинающийся с = + - @, Excel выполнил бы как формулу
        @staticmethod
        def writerow(row):
            raw.writerow([("'" + v) if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r") else v for v in row])
    w = _Safe
    w.writerow(["Номер", "Дата", "Тип", "Статус", "Клиент", "Телефон", "E-mail", "Город", "Автомобиль", "Позиции",
                "Сумма, ₽", "Оплата", "Статус оплаты", "Оплачено, ₽", "Доставка", "VIN", "Комментарий"])
    for o in rows:
        items = "; ".join(f"{i.title} — {i.variant_name} × {i.qty}" for i in o.items)
        w.writerow([o.number, local(o.created_at), o.kind_title, o.status_title, o.name, o.phone, o.email, o.city, o.car_title,
                    items, o.total_kop // 100, PAY_SCHEMES.get(o.pay_scheme, ""), PAY_STATUSES.get(o.pay_status, ""),
                    o.paid_kop // 100, o.delivery_title, o.vin, (o.comment or o.message)[:500]])
    name = f"avtostil-{dt.date.today():%Y-%m-%d}.csv"
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}"})


# ---------- карточка ----------
def _order(db: Session, oid: int) -> Order:
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, detail="Заказ не найден")
    return o


@router.get("/orders/{oid}", response_class=HTMLResponse)
def order_card(oid: int, request: Request, s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    o = _order(db, oid)
    vin = vin_base.decode(o.vin, learned_for(db, o.vin)) if o.vin else None
    # кандидаты для сверки VIN: что нашлось по VIN + все лекала этой модели
    cand = []
    if vin:
        cand += [m["slug"] for m in vin["matches"]]
    if o.car_slug and o.car_slug in catalog.models:
        cand += [m.s for m in catalog.families.get(catalog.models[o.car_slug].f, [])]
    cand = [catalog.models[x] for x in dict.fromkeys(cand) if x in catalog.models]
    return render(request, "admin/order.html", {"o": o, "vin": vin, "cand": cand, "rest": o.rest_kop,
                                                "statuses": STATUSES if o.is_order else REQUEST_STATUSES})


@router.post("/orders/{oid}/status")
def order_status(oid: int, request: Request, status: str = Form(...), track: str = Form(""), csrf: str = Form(""),
                 s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    o = _order(db, oid)
    allowed = STATUSES if o.is_order else REQUEST_STATUSES
    if status not in allowed:
        raise HTTPException(400)
    changes = []
    if status != o.status:
        changes.append(f"статус: {o.status_title} → {allowed[status]}")
        o.status = status
    track = track.strip()[:64]
    if track != o.track_number:
        changes.append(f"трек-номер: {track or 'удалён'}")
        o.track_number = track
    if changes:
        o.events.append(OrderEvent(type="status", actor=s.user.username, text="; ".join(changes).capitalize()))
        db.commit()
    return back(f"/admin/orders/{oid}", "Сохранено" if changes else "")


@router.post("/orders/{oid}/note")
def order_note(oid: int, request: Request, text: str = Form(...), csrf: str = Form(""), s: AdminSession = Depends(current),
               db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    o = _order(db, oid)
    text = text.strip()[:2000]
    if text:
        o.events.append(OrderEvent(type="note", actor=s.user.username, text=text))
        db.commit()
    return back(f"/admin/orders/{oid}#history")


@router.post("/orders/{oid}/vin")
def order_vin(oid: int, request: Request, slug: str = Form(...), csrf: str = Form(""), s: AdminSession = Depends(current),
              db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    o = _order(db, oid)
    try:
        key = learn_vin(db, o, slug, s.user.username)
    except OrderError as e:
        return back(f"/admin/orders/{oid}#vin", err=str(e))
    db.commit()
    return back(f"/admin/orders/{oid}#vin", f"Лекало подтверждено, {key.replace('FRAME:', 'кузов ')} запомнили для следующих клиентов")


@router.post("/orders/{oid}/payment-link")
async def order_payment_link(oid: int, request: Request, amount: int = Form(...), csrf: str = Form(""),
                             s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    """Ссылка на оплату остатка или доплаты — менеджер отправляет её клиенту в мессенджер."""
    check_csrf(request, s, csrf)
    o = _order(db, oid)
    if not o.is_order or not settings.payments_online:
        return back(f"/admin/orders/{oid}#pay", err="Онлайн-оплата недоступна для этого заказа")
    if not 1 <= amount <= 1_000_000:
        return back(f"/admin/orders/{oid}#pay", err="Сумма — от 1 до 1 000 000 ₽")
    try:
        p = await start_payment(db, o, "rest", amount * 100, s.user.username)
    except PaymentError as e:
        return back(f"/admin/orders/{oid}#pay", err=f"Платёж не создан: {e}")
    return back(f"/admin/orders/{oid}#pay", f"Ссылка на оплату {amount} ₽ создана: {p.confirmation_url}")


@router.post("/orders/{oid}/manual-payment")
def order_manual_payment(oid: int, request: Request, amount: int = Form(...), method: str = Form("cash"), csrf: str = Form(""),
                         s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    """Оплата мимо сайта: наличные, наложенный платёж, счёт юрлица, перевод."""
    check_csrf(request, s, csrf)
    o = _order(db, oid)
    methods = {"cash": "наличные", "cod": "наложенный платёж", "invoice": "оплата по счёту", "transfer": "перевод"}
    if method not in methods or not 1 <= amount <= 1_000_000 or not o.is_order:
        return back(f"/admin/orders/{oid}#pay", err="Проверьте сумму и способ")
    o.payments.append(Payment(public_id=uuid.uuid4().hex, provider="manual", purpose="manual",
                              amount_kop=amount * 100, status="succeeded", idempotence_key=uuid.uuid4().hex, method=method,
                              paid_at=utcnow(), created_by=s.user.username))
    recalc_paid(o)
    o.events.append(OrderEvent(type="payment", actor=s.user.username, text=f"Оплата {amount} ₽ отмечена вручную: {methods[method]}"))
    db.commit()
    return back(f"/admin/orders/{oid}#pay", "Оплата отмечена")


@router.post("/orders/{oid}/delete")
def order_delete(oid: int, request: Request, csrf: str = Form(""), s: AdminSession = Depends(require_admin), db: Session = Depends(get_db)):
    """Удаление по запросу клиента (152-ФЗ) или спама. Только администратор; оплаченные заказы не удаляются."""
    check_csrf(request, s, csrf)
    o = _order(db, oid)
    if o.paid_kop:
        return back(f"/admin/orders/{oid}", err="Оплаченный заказ удалить нельзя — он нужен для бухгалтерии")
    db.delete(o)
    db.commit()
    return back("/admin/orders", f"{o.number} удалён")


# ---------- VIN ----------
@router.get("/vin", response_class=HTMLResponse)
def vin_page(request: Request, q: str = "", s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    res = vin_base.decode(q, learned_for(db, q)) if q.strip() else None
    learned = db.scalars(select(VinLearned).order_by(VinLearned.updated_at.desc()).limit(300)).all()
    legend = [lg for lg in vin_base.legend if res and res.get("vin") and res["vin"][:3] in (lg.get("wmi") or [])] if res else []
    return render(request, "admin/vin.html", {"q": q, "res": res, "learned": learned, "stats": vin_base.stats, "legend": legend})


@router.post("/vin/learned/{rid}/delete")
def vin_learned_delete(rid: int, request: Request, csrf: str = Form(""), s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    row = db.get(VinLearned, rid)
    if row:
        db.delete(row)
        db.commit()
    return back("/admin/vin", "Правило удалено")


# ---------- пользователи и аккаунт ----------
@router.get("/users", response_class=HTMLResponse)
def users(request: Request, s: AdminSession = Depends(require_admin), db: Session = Depends(get_db)):
    return render(request, "admin/users.html", {"users": db.scalars(select(AdminUser).order_by(AdminUser.id)).all()})


@router.post("/users")
def user_create(request: Request, username: str = Form(...), name: str = Form(""), role: str = Form("manager"),
                password: str = Form(...), csrf: str = Form(""), s: AdminSession = Depends(require_admin), db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    username = username.strip().lower()
    if not re.match(r"^[a-z0-9._-]{3,40}$", username) or role not in ("admin", "manager"):
        return back("/admin/users", err="Логин — латиница, цифры, точка, дефис (3–40 символов)")
    if problem := password_problems(password):
        return back("/admin/users", err=problem)
    if db.scalar(select(AdminUser).where(AdminUser.username == username)):
        return back("/admin/users", err="Такой логин уже есть")
    db.add(AdminUser(username=username, name=name.strip()[:120], role=role, password_hash=hash_password(password)))
    db.commit()
    return back("/admin/users", f"Пользователь {username} создан")


@router.post("/users/{uid}/toggle")
def user_toggle(uid: int, request: Request, csrf: str = Form(""), s: AdminSession = Depends(require_admin), db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    u = db.get(AdminUser, uid)
    if not u or u.id == s.user_id:
        return back("/admin/users", err="Себя отключить нельзя")
    u.is_active = not u.is_active
    if not u.is_active:
        db.execute(AdminSession.__table__.delete().where(AdminSession.user_id == u.id))
    db.commit()
    return back("/admin/users", "Сохранено")


@router.get("/account", response_class=HTMLResponse)
def account(request: Request, s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    secret = request.query_params.get("setup") and totp_new_secret()
    return render(request, "admin/account.html", {"secret": secret, "uri": totp_uri(secret, s.user.username) if secret else "",
                                                   "sessions": db.scalars(select(AdminSession).where(AdminSession.user_id == s.user_id)).all()})


@router.post("/account/password")
def account_password(request: Request, old: str = Form(...), new: str = Form(...), csrf: str = Form(""),
                     s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    if not verify_password(old, s.user.password_hash):
        return back("/admin/account", err="Старый пароль неверный")
    if problem := password_problems(new):
        return back("/admin/account", err=problem)
    s.user.password_hash = hash_password(new)
    db.execute(AdminSession.__table__.delete().where(AdminSession.user_id == s.user_id, AdminSession.id != s.id))
    db.commit()
    return back("/admin/account", "Пароль изменён, остальные сессии закрыты")


@router.post("/account/totp")
def account_totp(request: Request, secret: str = Form(""), code: str = Form(""), off: str = Form(""), csrf: str = Form(""),
                 s: AdminSession = Depends(current), db: Session = Depends(get_db)):
    check_csrf(request, s, csrf)
    if off:
        if not totp_verify(s.user.totp_secret, code):
            return back("/admin/account", err="Неверный код — двухфакторный вход не отключён")
        s.user.totp_secret = ""
        db.commit()
        return back("/admin/account", "Двухфакторный вход отключён")
    if not re.match(r"^[A-Z2-7]{16,64}$", secret):
        return back("/admin/account", err="Начните настройку заново")
    if not totp_verify(secret, code):
        sessions = db.scalars(select(AdminSession).where(AdminSession.user_id == s.user_id)).all()
        return render(request, "admin/account.html", {"secret": secret, "uri": totp_uri(secret, s.user.username), "sessions": sessions,
                                                       "totp_error": "Код не подошёл — проверьте время на телефоне и введите следующий код"})
    s.user.totp_secret = secret
    db.commit()
    return back("/admin/account", "Двухфакторный вход включён")
