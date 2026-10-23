"""Уведомления: менеджерам — в Telegram и на почту о каждом заказе, заявке и оплате; клиенту — письмо с номером заказа.
Отправка в фоне: если Telegram или почта недоступны, заказ всё равно сохранён, ошибка — в журнале и в истории заказа."""
from __future__ import annotations

import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import List

import httpx

from .config import settings
from .db import session_scope
from .models import KINDS, PAY_SCHEMES, Order, OrderEvent

log = logging.getLogger("avtostil.notify")


def rub(kop: int) -> str:
    return f"{kop // 100:,}".replace(",", " ") + (f",{kop % 100:02d}" if kop % 100 else "") + " ₽"


def admin_link(order: Order) -> str:
    return f"{settings.site_url}/admin/orders/{order.id}"


def manager_text(order: Order, title: str = "") -> str:
    """Короткая сводка для Telegram (HTML)."""
    e = html.escape
    head = title or f"{KINDS.get(order.kind, order.kind)} {order.number}"
    lines = [f"<b>{e(head)}</b>"]
    for it in order.items:
        lines.append(f"• {e(it.brand)} {e(' '.join(x for x in (it.model, it.generation) if x))}"
                     f"{' (' + e(it.salon) + ')' if it.salon else ''} — {e(it.material)}, {e(it.color)} × {it.qty} = {rub(it.sum_kop)}")
    if order.car_title and not order.items:
        lines.append(f"Автомобиль: {e(order.car_title)}")
    if order.config and order.config.get("summary"):
        lines += [f"{e(k)}: {e(v)}" for k, v in order.config["summary"][:10]]
    if order.is_order:
        lines.append(f"Сумма: <b>{rub(order.total_kop)}</b>{' + доставка по тарифу' if order.delivery_kop is None else ''}")
        lines.append(f"Оплата: {e(PAY_SCHEMES.get(order.pay_scheme, order.pay_scheme))}"
                     + (f", к оплате сейчас {rub(order.due_now_kop)}" if order.due_now_kop else ""))
        lines.append(f"Доставка: {e(order.delivery_title)}{', ' + e(order.city) if order.city else ''}")
    if order.extras:
        ex = [n for k, n in (("mats", "коврики EVA"), ("install", "установка")) if order.extras.get(k)]
        if ex:
            lines.append("Дополнительно: " + ", ".join(ex))
    if order.vin:
        lines.append(f"VIN: <code>{e(order.vin)}</code>{' ⚠️ не совпадает с лекалом' if order.vin_state in ('mismatch', 'year', 'body') else ''}")
    contact = ", ".join(x for x in (order.name, order.phone, order.email) if x)
    lines.append(f"Клиент: {e(contact)}" + (f" ({e(order.contact_method)})" if order.contact_method else ""))
    if order.topic:
        lines.append(f"Тема: {e(order.topic)}")
    if order.message:
        lines.append(f"Сообщение: {e(order.message[:600])}")
    if order.comment:
        lines.append(f"Комментарий: {e(order.comment[:600])}")
    lines.append(admin_link(order))
    return "\n".join(lines)


async def send_telegram(text: str) -> List[str]:
    errors = []
    if not settings.telegram_bot_token or not settings.telegram_chat_ids:
        return errors
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as c:
        for chat in settings.telegram_chat_ids:
            try:
                r = await c.post(url, json={"chat_id": chat, "text": text[:4000], "parse_mode": "HTML",
                                            "disable_web_page_preview": True})
                if r.status_code != 200:
                    errors.append(f"telegram {chat}: {r.status_code}")
            except httpx.HTTPError as ex:
                errors.append(f"telegram {chat}: {ex.__class__.__name__}")
    return errors


def send_email(to: List[str], subject: str, body: str) -> List[str]:
    if not settings.smtp_host or not to:
        return []
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = subject, settings.smtp_from, ", ".join(to)
    msg.set_content(body)
    try:
        if settings.smtp_tls == "ssl":
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15, context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
            if settings.smtp_tls == "starttls":
                server.starttls(context=ssl.create_default_context())
        with server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        return []
    except (OSError, smtplib.SMTPException) as ex:
        return [f"email: {ex.__class__.__name__}"]


def customer_text(order: Order) -> str:
    lines = [f"Здравствуйте{', ' + order.name if order.name else ''}!", "",
             f"Ваш заказ {order.number} принят." if order.is_order else f"Ваша заявка {order.number} принята.", ""]
    for it in order.items:
        lines.append(f"— {it.title}, {it.variant_name.lower()} × {it.qty}: {rub(it.sum_kop)}")
    if order.is_order:
        lines += ["", f"Итого: {rub(order.total_kop)}" + (" без доставки (по тарифу транспортной компании)" if order.delivery_kop is None else ""),
                  f"Доставка: {order.delivery_title}", f"Оплата: {PAY_SCHEMES.get(order.pay_scheme, '')}"]
        if order.paid_kop:
            lines.append(f"Оплачено: {rub(order.paid_kop)}")
        elif order.due_now_kop:
            lines.append(f"Оплатить онлайн: {settings.site_url}/thanks.html?order={order.public_id}")
    lines += ["", "В рабочее время менеджер перезвонит и уточнит комплектацию салона. Перед отправкой пришлём фотоотчёт.",
              "", "Автостиль · 8 (800) 775-32-60 · 1avtochehol.ru"]
    return "\n".join(lines)


async def notify_managers(order_id: int, title: str = "") -> None:
    with session_scope() as db:
        order = db.get(Order, order_id)
        if not order:
            return
        text = manager_text(order, title)
        subject = title or f"{order.kind_title} {order.number}"
        plain = html.unescape(text.replace("<b>", "").replace("</b>", "").replace("<code>", "").replace("</code>", ""))
    errors = await send_telegram(text)
    errors += send_email(settings.manager_emails, subject, plain)
    _log(order_id, "notify", "Уведомление менеджерам" + (": ошибки — " + "; ".join(errors) if errors else ""), errors)


async def notify_customer(order_id: int) -> None:
    if not settings.customer_emails:
        return
    with session_scope() as db:
        order = db.get(Order, order_id)
        if not order or not order.email:
            return
        subject = f"Автостиль: {'заказ' if order.is_order else 'заявка'} {order.number}"
        body, to = customer_text(order), [order.email]
    errors = send_email(to, subject, body)
    if settings.smtp_host:
        _log(order_id, "notify", "Письмо клиенту" + (": ошибка — " + "; ".join(errors) if errors else ""), errors)


def _log(order_id: int, typ: str, text: str, errors: List[str]) -> None:
    if errors:
        log.warning("заказ %s: %s", order_id, text)
    if not (settings.telegram_bot_token or settings.smtp_host):
        return
    with session_scope() as db:
        db.add(OrderEvent(order_id=order_id, type=typ, text=text, data={"errors": errors} if errors else None))
