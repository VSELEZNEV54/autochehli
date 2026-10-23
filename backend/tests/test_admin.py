import re
import time

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.models import AdminUser, Order, VinLearned
from app.security import _totp_at, hash_password, totp_new_secret
from conftest import ORIGIN, order_body

PASSWORD = "Manager-2026-pass"


@pytest.fixture
def manager():
    with SessionLocal() as db:
        db.add(AdminUser(username="olga", name="Ольга", role="manager", password_hash=hash_password(PASSWORD)))
        db.commit()


def login(client, password=PASSWORD, code=""):
    return client.post("/admin/login", data={"username": "olga", "password": password, "code": code, "next": "/admin/orders"},
                       follow_redirects=False)


def csrf_of(client, url):
    html = client.get(url).text
    return re.search(r'name="csrf" value="([^"]+)"', html).group(1)


def test_login_logout_and_lockout(client, manager):
    assert client.get("/admin/orders", follow_redirects=False).status_code == 303
    assert login(client, "wrong").status_code == 401
    r = login(client)
    assert r.status_code == 303 and "as_admin" in r.cookies
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie and "path=/admin" in cookie
    assert client.get("/admin/orders").status_code == 200
    token = csrf_of(client, "/admin/orders")
    client.post("/admin/logout", data={"csrf": token})
    assert client.get("/admin/orders", follow_redirects=False).status_code == 303
    for _ in range(5):
        login(client, "wrong")
    assert "заблокирован" in login(client).text   # верный пароль, но аккаунт заблокирован на 15 минут


def test_order_card_shows_what_was_ordered(client, manager):
    num = client.post("/api/orders", json=order_body(payment="prepay", delivery="pickup", vin="XW7BF4FK40S012345",
                                                     comment="Салон с подлокотником"), headers=ORIGIN).json()["number"]
    login(client)
    lst = client.get("/admin/orders?tab=orders").text
    assert num in lst and "Toyota Camry XV70" in lst and "Ждём оплату" in lst
    with SessionLocal() as db:
        oid = db.scalar(select(Order.id).where(Order.number == num))
    card = client.get(f"/admin/orders/{oid}").text
    for text in ("Заказ " + num, "Toyota", "Camry XV70", "Экокожа", "Чёрная перфорация", "Предоплата", "Самовывоз в Новосибирске",
                 "Иван Петров", "+7 (913) 123-45-67", "XW7BF4FK40S012345", "Салон с подлокотником", "1 000 ₽"):
        assert text in card, text
    assert "default-src 'self'" in client.get(f"/admin/orders/{oid}").headers["content-security-policy"]


def test_csrf_status_note_manual_payment(client, manager):
    num = client.post("/api/orders", json=order_body(payment="prepay"), headers=ORIGIN).json()["number"]
    login(client)
    with SessionLocal() as db:
        oid = db.scalar(select(Order.id).where(Order.number == num))
    assert client.post(f"/admin/orders/{oid}/status", data={"status": "confirmed", "csrf": "bad"}).status_code == 403
    token = csrf_of(client, f"/admin/orders/{oid}")
    client.post(f"/admin/orders/{oid}/status", data={"status": "shipped", "track": "1234567890", "csrf": token})
    client.post(f"/admin/orders/{oid}/note", data={"text": "Салон 60/40, без подлокотника", "csrf": token})
    client.post(f"/admin/orders/{oid}/manual-payment", data={"amount": "9375", "method": "cod", "csrf": token})
    with SessionLocal() as db:
        o = db.get(Order, oid)
        assert o.status == "shipped" and o.track_number == "1234567890"
        assert o.paid_kop == 9375_00 and o.pay_status == "paid"
        assert any(e.type == "note" and "60/40" in e.text for e in o.events)
    # менеджер не может удалять
    assert client.post(f"/admin/orders/{oid}/delete", data={"csrf": token}).status_code == 403


def test_vin_confirmation_teaches_the_base(client, manager):
    vin = "XW7BF4FK40S012345"
    num = client.post("/api/orders", json=order_body(vin=vin), headers=ORIGIN).json()["number"]
    login(client)
    with SessionLocal() as db:
        oid = db.scalar(select(Order.id).where(Order.number == num))
    token = csrf_of(client, f"/admin/orders/{oid}")
    client.post(f"/admin/orders/{oid}/vin", data={"slug": "toyota_camry-xv70", "csrf": token})
    with SessionLocal() as db:
        row = db.scalar(select(VinLearned))
        assert row.key == "XW7BF4FK" and row.slug == "toyota_camry-xv70"
        assert db.get(Order, oid).vin_state == "ok"
    d = client.get("/api/vin", params={"q": "XW7BF4FK50S099999"}).json()
    assert [m["slug"] for m in d["matches"]] == ["toyota_camry-xv70"] and d["vehicle"]["confidence"] == "learned"
    assert "XW7BF4FK" in client.get("/admin/vin").text


def test_totp_login(client, manager):
    secret = totp_new_secret()
    with SessionLocal() as db:
        db.scalar(select(AdminUser)).totp_secret = secret
        db.commit()
    assert login(client).status_code == 401
    assert login(client, code=_totp_at(secret, int(time.time() // 30))).status_code == 303


def test_csv_export(client, manager):
    client.post("/api/orders", json=order_body(), headers=ORIGIN)
    login(client)
    r = client.get("/admin/orders.csv")
    assert r.status_code == 200 and r.text.startswith("﻿Номер;") and "Toyota Camry XV70" in r.text


def test_custom_request_card(client, manager):
    num = client.post("/api/requests", headers=ORIGIN, json={
        "kind": "custom", "name": "Анна", "phone": "+7 999 111 22 33", "model": "lada_granta", "message": "Хочу ромб",
        "config": {"mat": "alc", "design": "rhomb"}, "summary": [["Вставки", "Алькантара светлая"], ["Рисунок", "Ромб"]],
        "consent": True, "meta": {"elapsed_ms": 9000}}).json()["number"]
    login(client)
    with SessionLocal() as db:
        o = db.scalar(select(Order).where(Order.number == num))
        oid, price = o.id, o.config["price_from"]
    card = client.get(f"/admin/orders/{oid}").text
    rub_text = f"{price:,}".replace(",", " ") + " ₽"
    assert f"от {rub_text}" in card and card.count("₽") < 20
    assert "Алькантара светлая" in card and "Хочу ромб" in card and "Заявка на пошив" in card


def test_admin_escapes_customer_input_and_csv_formulas(client, manager):
    client.post("/api/requests", headers=ORIGIN, json={"kind": "question", "name": "Олег", "contact": "+7 913 000 00 00",
                                                        "message": "=HYPERLINK(\"x\") <script>alert(1)</script>", "consent": True})
    login(client)
    with SessionLocal() as db:
        oid = db.scalar(select(Order.id))
    card = client.get(f"/admin/orders/{oid}").text
    assert "<script>alert(1)</script>" not in card and "&lt;script&gt;" in card
    csv_text = client.get("/admin/orders.csv").text
    assert "'=HYPERLINK" in csv_text and ';=HYPERLINK' not in csv_text and ";'+7 (913)" in csv_text
