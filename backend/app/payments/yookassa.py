"""ЮKassa, API v3: https://yookassa.ru/developers/api
Создаём платёж со сценарием redirect: клиент оформляет заказ у нас, уходит на страницу ЮKassa и возвращается на thanks.html.
Статус берём не из тела уведомления, а повторным запросом GET /payments/{id} — так поддельное уведомление ничего не изменит."""
from __future__ import annotations

import ipaddress
from typing import Optional

import httpx

from ..config import settings
from .base import PaymentError, PaymentRequest, Provider, ProviderPayment

API = "https://api.yookassa.ru/v3"
# Адреса, с которых ЮKassa шлёт HTTP-уведомления (раздел «Входящие уведомления» документации)
NOTIFY_NETWORKS = [
    "185.71.76.0/27", "185.71.77.0/27", "77.75.153.0/25", "77.75.156.11/32",
    "77.75.156.35/32", "77.75.154.128/25", "2a02:5180::/32",
]


def is_yookassa_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(addr in ipaddress.ip_network(n) for n in NOTIFY_NETWORKS)


def _money(kop: int) -> dict:
    return {"value": f"{kop // 100}.{kop % 100:02d}", "currency": "RUB"}


def _kop(amount: Optional[dict]) -> int:
    if not amount:
        return 0
    rub, _, kop = str(amount.get("value", "0")).partition(".")
    return int(rub) * 100 + int((kop + "00")[:2])


class YooKassa(Provider):
    name = "yookassa"

    def __init__(self, shop_id: str, secret_key: str, transport: Optional[httpx.AsyncBaseTransport] = None):
        self._auth = (shop_id, secret_key)
        self._transport = transport

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=API, auth=self._auth, timeout=httpx.Timeout(15, connect=5), transport=self._transport)

    def _body(self, req: PaymentRequest) -> dict:
        body = {
            "amount": _money(req.amount_kop),
            "capture": True,
            "confirmation": {"type": "redirect", "return_url": req.return_url, "locale": "ru_RU"},
            "description": req.description[:128],
            "metadata": req.metadata,
        }
        if settings.yookassa_receipts and req.receipt:
            customer = {}
            if req.customer_email:
                customer["email"] = req.customer_email
            if req.customer_phone:
                customer["phone"] = "".join(c for c in req.customer_phone if c.isdigit())
            receipt = {"customer": customer, "items": [self._receipt_item(line) for line in req.receipt]}
            if settings.yookassa_tax_system:
                receipt["tax_system_code"] = settings.yookassa_tax_system
            body["receipt"] = receipt
        return body

    @staticmethod
    def _receipt_item(line) -> dict:
        """В чеке amount — цена за единицу. Если сумма строки не делится на количество (бывает при разбивке
        предоплаты), пробиваем строку одной единицей на всю сумму."""
        qty, price, desc = line.quantity, line.amount_kop // max(line.quantity, 1), line.description
        if line.amount_kop % max(qty, 1):
            qty, price, desc = 1, line.amount_kop, f"{desc}, {line.quantity} шт."
        return {"description": desc[:128], "quantity": f"{qty}.00", "amount": _money(price),
                "vat_code": settings.yookassa_vat_code, "payment_mode": line.payment_mode,
                "payment_subject": line.payment_subject}

    @staticmethod
    def _parse(data: dict) -> ProviderPayment:
        conf = data.get("confirmation") or {}
        cancel = data.get("cancellation_details") or {}
        method = (data.get("payment_method") or {}).get("type", "")
        return ProviderPayment(
            id=data["id"], status=data.get("status", ""), amount_kop=_kop(data.get("amount")), paid=bool(data.get("paid")),
            confirmation_url=conf.get("confirmation_url", ""), method=method,
            cancel_reason=cancel.get("reason", ""), metadata=data.get("metadata") or {}, raw=data)

    async def create(self, req: PaymentRequest) -> ProviderPayment:
        try:
            async with self._client() as c:
                r = await c.post("/payments", json=self._body(req), headers={"Idempotence-Key": req.idempotence_key})
        except httpx.HTTPError as e:
            raise PaymentError(f"ЮKassa недоступна: {e.__class__.__name__}") from e
        if r.status_code >= 400:
            try:
                err = r.json()
                text = f"{err.get('code', '')}: {err.get('description', '')}"
            except ValueError:
                text = r.text[:200]
            raise PaymentError(f"ЮKassa отклонила платёж ({r.status_code}) {text}")
        return self._parse(r.json())

    async def fetch(self, payment_id: str) -> ProviderPayment:
        try:
            async with self._client() as c:
                r = await c.get(f"/payments/{payment_id}")
        except httpx.HTTPError as e:
            raise PaymentError(f"ЮKassa недоступна: {e.__class__.__name__}") from e
        if r.status_code >= 400:
            raise PaymentError(f"ЮKassa: платёж {payment_id} не найден ({r.status_code})")
        return self._parse(r.json())
