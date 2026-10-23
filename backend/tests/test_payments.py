import asyncio
import json

import httpx
import pytest
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import Order, Payment
from app.payments.base import PaymentRequest, ReceiptLine, split_amount
from app.payments.yookassa import YooKassa, is_yookassa_ip
from conftest import ORIGIN, order_body


def test_split_amount_keeps_every_kopeck():
    parts = split_amount(1000_00, [9375_00, 7975_00, 9975_00])
    assert sum(parts) == 1000_00 and all(p > 0 for p in parts)
    assert split_amount(1, [1, 1, 1]) == [1, 0, 0]


def test_yookassa_request_shape(monkeypatch):
    seen = {}

    def handler(req: httpx.Request):
        seen["auth"] = req.headers["authorization"]
        seen["idem"] = req.headers["idempotence-key"]
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, json={"id": "2c3f-test", "status": "pending", "paid": False,
                                         "amount": {"value": "1000.00", "currency": "RUB"},
                                         "confirmation": {"type": "redirect", "confirmation_url": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=2c3f"}})
    monkeypatch.setattr(settings, "yookassa_receipts", True)
    yk = YooKassa("123456", "test_secret", transport=httpx.MockTransport(handler))
    req = PaymentRequest(amount_kop=1000_00, description="Предоплата по заказу AS-100001", return_url="https://1avtochehol.ru/thanks.html?order=x",
                         idempotence_key="k-1", metadata={"order": "AS-100001"}, customer_email="a@b.ru", customer_phone="+7 (913) 123-45-67",
                         receipt=[ReceiptLine("Чехлы на Toyota Camry XV70", 1, 1000_00, "partial_prepayment")])
    pp = asyncio.run(yk.create(req))
    assert pp.id == "2c3f-test" and pp.confirmation_url.startswith("https://yoomoney.ru")
    b = seen["body"]
    assert seen["idem"] == "k-1" and seen["auth"].startswith("Basic ")
    assert b["amount"] == {"value": "1000.00", "currency": "RUB"} and b["capture"] is True
    assert b["confirmation"]["type"] == "redirect" and b["metadata"]["order"] == "AS-100001"
    item = b["receipt"]["items"][0]
    assert item["payment_mode"] == "partial_prepayment" and item["amount"]["value"] == "1000.00" and b["receipt"]["customer"]["phone"] == "79131234567"


def test_yookassa_ip_allowlist():
    assert is_yookassa_ip("185.71.76.5") and is_yookassa_ip("77.75.156.11") and is_yookassa_ip("2a02:5180::1")
    assert not is_yookassa_ip("8.8.8.8") and not is_yookassa_ip("127.0.0.1") and not is_yookassa_ip("junk")


class FakeYK:
    """Провайдер, который «знает» реальный статус платежа — как GET /payments/{id} у ЮKassa."""
    name = "yookassa"

    def __init__(self, status="succeeded", amount=1000_00):
        self.status, self.amount = status, amount

    async def fetch(self, pid):
        from app.payments.base import ProviderPayment
        return ProviderPayment(id=pid, status=self.status, amount_kop=self.amount, paid=self.status == "succeeded",
                               method="sbp", raw={"id": pid, "status": self.status})


@pytest.fixture
def yk_order(client, monkeypatch):
    r = client.post("/api/orders", json=order_body(), headers=ORIGIN).json()
    with SessionLocal() as db:
        pay = db.scalar(select(Payment))
        pay.provider, pay.provider_payment_id = "yookassa", "yk-777"
        db.commit()
    monkeypatch.setattr(settings, "payment_provider", "yookassa")
    monkeypatch.setattr(settings, "trusted_proxies", ["testclient", "127.0.0.1"])
    return r


def _webhook(client, ip="185.71.76.10", event="payment.succeeded", pid="yk-777"):
    return client.post("/api/payments/yookassa/webhook", headers={"X-Real-IP": ip},
                       json={"type": "notification", "event": event, "object": {"id": pid, "status": "succeeded"}})


def test_webhook_checks_ip_and_verifies_status(client, yk_order, monkeypatch):
    import app.routers.public as pub
    monkeypatch.setattr(pub, "get_provider", lambda: FakeYK("succeeded"))
    assert _webhook(client, ip="8.8.8.8").status_code == 403
    assert _webhook(client).status_code == 200
    assert _webhook(client).status_code == 200  # повтор — без двойного зачисления
    with SessionLocal() as db:
        o = db.scalar(select(Order))
        assert o.pay_status == "partially_paid" and o.paid_kop == 1000_00
        assert sum(1 for e in o.events if e.text.startswith("Оплата 1000")) == 1


def test_forged_webhook_does_not_mark_paid(client, yk_order, monkeypatch):
    import app.routers.public as pub
    monkeypatch.setattr(pub, "get_provider", lambda: FakeYK("pending"))   # API говорит: не оплачено
    assert _webhook(client).status_code == 200
    with SessionLocal() as db:
        assert db.scalar(select(Order)).pay_status == "pending"


def test_amount_mismatch_is_not_applied(client, yk_order, monkeypatch):
    import app.routers.public as pub
    monkeypatch.setattr(pub, "get_provider", lambda: FakeYK("succeeded", amount=1_00))
    _webhook(client)
    with SessionLocal() as db:
        o = db.scalar(select(Order))
        assert o.paid_kop == 0 and any("не совпала" in e.text for e in o.events)


def test_unknown_payment_webhook_is_acknowledged(client, yk_order, monkeypatch):
    import app.routers.public as pub
    monkeypatch.setattr(pub, "get_provider", lambda: FakeYK("succeeded"))
    assert _webhook(client, pid="unknown-1").status_code == 200
