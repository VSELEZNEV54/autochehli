"""Тестовая касса для разработки: та же цепочка, что с ЮKassa (создание → страница оплаты → уведомление → проверка),
но страница оплаты — наша /api/payments/mock/<id> с кнопками «Оплатить» и «Отменить». В проде запрещена (config.validate)."""
from __future__ import annotations

import secrets
from typing import Dict

from ..config import settings
from .base import PaymentError, PaymentRequest, Provider, ProviderPayment

_PAYMENTS: Dict[str, ProviderPayment] = {}


class MockProvider(Provider):
    name = "mock"

    async def create(self, req: PaymentRequest) -> ProviderPayment:
        for p in _PAYMENTS.values():  # идемпотентность, как у ЮKassa
            if p.raw and p.raw.get("idempotence_key") == req.idempotence_key:
                return p
        pid = "mock-" + secrets.token_hex(8)
        p = ProviderPayment(id=pid, status="pending", amount_kop=req.amount_kop,
                            confirmation_url=f"{settings.site_url}/api/payments/mock/{pid}",
                            metadata=dict(req.metadata),
                            raw={"idempotence_key": req.idempotence_key, "return_url": req.return_url, "description": req.description})
        _PAYMENTS[pid] = p
        return p

    async def fetch(self, payment_id: str) -> ProviderPayment:
        p = _PAYMENTS.get(payment_id)
        if not p:
            raise PaymentError("Тестовый платёж не найден (тестовая касса хранит платежи до перезапуска сервера)")
        return p


def mock_get(payment_id: str):
    return _PAYMENTS.get(payment_id)


def mock_finish(payment_id: str, success: bool) -> ProviderPayment:
    p = _PAYMENTS[payment_id]
    if p.status == "pending":
        p.status, p.paid = ("succeeded", True) if success else ("canceled", False)
        p.method = "bank_card" if success else ""
        p.cancel_reason = "" if success else "canceled_by_user"
    return p
