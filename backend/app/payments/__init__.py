"""Платёжные провайдеры. Сейчас: ЮKassa и тестовая касса (mock) для разработки.
Новый провайдер (Т-Банк, Сбер, Robokassa) — класс с методами create() и fetch() по образцу yookassa.py."""
from __future__ import annotations

from ..config import settings
from .base import PaymentError, ProviderPayment, Provider


def get_provider() -> Provider:
    if settings.payment_provider == "yookassa":
        from .yookassa import YooKassa
        return YooKassa(settings.yookassa_shop_id, settings.yookassa_secret_key)
    if settings.payment_provider == "mock":
        from .mock import MockProvider
        return MockProvider()
    raise PaymentError("Онлайн-оплата отключена (PAYMENT_PROVIDER=none)")


__all__ = ["get_provider", "PaymentError", "ProviderPayment", "Provider"]
