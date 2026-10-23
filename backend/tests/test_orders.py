from sqlalchemy import select

from app.db import SessionLocal
from app.models import Order
from conftest import ORIGIN, order_body


def _get(number):
    with SessionLocal() as db:
        o = db.scalar(select(Order).where(Order.number == number))
        o.items, o.payments, o.events  # подгрузить
        return o


def test_prepay_order_saves_everything_for_admin(client):
    r = client.post("/api/orders", json=order_body(delivery="nsk", vin="XW7BF4FK40S012345",
                                                  extras={"mats": True, "install": False}, comment="Позвонить вечером"), headers=ORIGIN)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["number"] == "AS-100001" and data["payment_url"]
    o = _get("AS-100001")
    assert o.kind == "order" and o.status == "new" and o.pay_scheme == "prepay" and o.pay_status == "pending"
    it = o.items[0]
    assert (it.brand, it.model, it.generation, it.material, it.color) == ("Toyota", "Camry", "XV70", "Экокожа", "Чёрная перфорация")
    assert it.price_kop == 9375_00 and it.old_price_kop == 12975_00
    assert o.delivery_title == "Курьер по Новосибирску" and o.delivery_kop == 385_00
    assert o.total_kop == (9375 + 385) * 100 and o.due_now_kop == 1000_00
    assert o.phone == "+7 (913) 123-45-67" and o.extras["mats"] is True and o.comment == "Позвонить вечером"
    assert o.vin == "XW7BF4FK40S012345" and o.vin_info and o.consent_at is not None
    assert o.payments[0].amount_kop == 1000_00 and o.payments[0].purpose == "prepay"


def test_full_payment_amount_and_tariff_delivery(client):
    r = client.post("/api/orders", json=order_body(payment="full", items=[
        {"id": "cover:toyota_camry-xv70:alc-rhomb-grey", "qty": 2}, {"id": "cover:lada_granta:jac-grey", "qty": 1}]), headers=ORIGIN)
    assert r.status_code == 200, r.text
    o = _get(r.json()["number"])
    camry, granta = o.items
    assert camry.sum_kop == 2 * camry.price_kop and camry.material == "Алькантара"
    assert o.delivery_kop is None  # DPD — по тарифу, в сумму не входит
    assert o.total_kop == camry.sum_kop + granta.sum_kop == o.due_now_kop
    assert "и ещё 1" in o.car_title


def test_price_from_browser_is_ignored(client):
    body = order_body()
    body["items"][0]["price"] = 1
    body["total"] = 1
    r = client.post("/api/orders", json=body, headers=ORIGIN)
    assert _get(r.json()["number"]).items[0].price_kop == 9375_00


def test_unknown_item_and_bad_fields(client):
    r = client.post("/api/orders", json=order_body(items=[{"id": "cover:nope:perf-black", "qty": 1}]), headers=ORIGIN)
    assert r.status_code == 422 and "каталоге" in r.json()["detail"]
    r = client.post("/api/orders", json=order_body(items=[{"id": "<script>", "qty": 1}]), headers=ORIGIN)
    assert r.status_code == 422
    r = client.post("/api/orders", json=order_body(customer={"name": "1234", "phone": "+7 913 123 45 67"}), headers=ORIGIN)
    assert r.status_code == 422 and r.json()["errors"][0]["field"] == "name"
    r = client.post("/api/orders", json=order_body(consent=False), headers=ORIGIN)
    assert r.status_code == 422
    r = client.post("/api/orders", json=order_body(items=[{"id": "cover:toyota_camry-xv70:perf-black", "qty": 99}]), headers=ORIGIN)
    assert r.status_code == 422


def test_invoice_requires_valid_inn(client):
    r = client.post("/api/orders", json=order_body(payment="invoice", company="ООО Ромашка", inn="1234567890"), headers=ORIGIN)
    assert r.status_code == 422 and "ИНН" in r.json()["detail"]
    r = client.post("/api/orders", json=order_body(payment="invoice", company="ООО «Чехлы Автостиль»", inn="5401970929"), headers=ORIGIN)
    assert r.status_code == 200, r.text
    o = _get(r.json()["number"])
    assert o.pay_status == "invoice" and not o.payments and r.json()["payment_url"] is None


def test_origin_and_rate_limit(client):
    assert client.post("/api/orders", json=order_body()).status_code == 403
    assert client.post("/api/orders", json=order_body(), headers={"Origin": "https://evil.example"}).status_code == 403
    codes = [client.post("/api/orders", json=order_body(), headers=ORIGIN).status_code for _ in range(7)]
    assert codes[:6] == [200] * 6 and codes[6] == 429


def test_bot_order_is_marked_spam_without_payment(client):
    r = client.post("/api/orders", json=order_body(meta={"hp": "http://spam", "elapsed_ms": 500}), headers=ORIGIN)
    assert r.status_code == 200 and r.json()["payment_url"] is None
    assert _get(r.json()["number"]).status == "spam"


def test_status_and_retry_payment(client):
    r = client.post("/api/orders", json=order_body(payment="full"), headers=ORIGIN).json()
    st = client.get(f"/api/orders/{r['order']}").json()
    assert st["can_pay"] and st["pay_status"] == "pending" and "phone" not in st
    pid = r["payment_url"].rsplit("/", 1)[1]
    client.post(f"/api/payments/mock/{pid}", data={"result": "cancel"}, follow_redirects=False)
    st = client.get(f"/api/orders/{r['order']}").json()
    assert st["pay_status"] == "canceled" and st["can_pay"]
    again = client.post(f"/api/orders/{r['order']}/pay", headers=ORIGIN).json()["payment_url"]
    assert again != r["payment_url"]
    client.post("/api/payments/mock/" + again.rsplit("/", 1)[1], data={"result": "success"}, follow_redirects=False)
    st = client.get(f"/api/orders/{r['order']}").json()
    assert st["pay_status"] == "paid" and not st["can_pay"]
    assert client.post(f"/api/orders/{r['order']}/pay", headers=ORIGIN).status_code == 409
    assert client.get("/api/orders/notarealid123456789").status_code == 404


def test_requests_custom_and_question(client):
    r = client.post("/api/requests", headers=ORIGIN, json={
        "kind": "custom", "name": "Анна", "phone": "+7 999 111 22 33", "contact_method": "telegram", "model": "lada_granta",
        "config": {"design": "rhomb", "mat": "alc", "side": "black", "ins": "cherry", "opts": ["mats"]},
        "summary": [["Автомобиль", "Lada Granta"], ["Материал", "Алькантара, вишня"]], "consent": True,
        "meta": {"elapsed_ms": 60000}})
    assert r.status_code == 200, r.text
    o = _get(r.json()["number"])
    granta_alc = o.config["price_from"]
    assert o.kind == "custom" and o.car_slug == "lada_granta" and o.extras["mats"] and granta_alc > 0
    assert o.contact_method == "telegram" and o.total_kop == granta_alc * 100
    r = client.post("/api/requests", headers=ORIGIN, json={"kind": "question", "name": "Олег", "contact": "Oleg@Mail.ru",
                                                           "message": "Подойдут ли чехлы на Camry с вентиляцией?", "consent": True})
    o = _get(r.json()["number"])
    assert o.kind == "question" and o.email == "oleg@mail.ru" and not o.phone
    r = client.post("/api/requests", headers=ORIGIN, json={"kind": "question", "name": "Олег", "contact": "", "message": "x", "consent": True})
    assert r.status_code == 422


def test_body_limit(client):
    r = client.post("/api/requests", headers={**ORIGIN, "Content-Type": "application/json"}, content=b"{" + b" " * 70000 + b"}")
    assert r.status_code == 413


def test_static_serves_only_public_files(client):
    assert client.get("/index.html").status_code == 200
    assert client.get("/js/app.js").status_code == 200
    for path in ("/backend/app/config.py", "/.git/config", "/build.py", "/content/index.html", "/backend/.env", "/js/../build.py"):
        assert client.get(path).status_code == 404, path


def test_custom_set_from_builder_priced_by_server(client):
    """Комплект из конструктора: цену считает сервер — лекало за материал вставок + рисунок + боковины из алькантары + доплаты."""
    cfg = {"design": "rhomb", "side_mat": "alc", "mat": "alc", "ins": "cherry", "ins_name": "Алькантара, вишня", "back": "black",
           "salon": {"kit": "full", "armrest": "yes"}, "opts": ["pillow-head", "mats"]}
    item = {"id": "custom:toyota_camry-xv70:a1b2c3d4", "qty": 1, "config": cfg, "label": "Ромб 35 мм, алькантара вишня, боковины из алькантары", "price": 1}
    r = client.post("/api/orders", json=order_body(items=[item]), headers=ORIGIN)
    assert r.status_code == 200, r.text
    o = _get(r.json()["number"])
    it = o.items[0]
    assert it.price_kop == (9975 + 1500 + 700 + 600) * 100 and it.variant_id == "custom" and it.material == "Алькантара"
    assert it.title.startswith("Индивидуальный пошив") and it.options["custom"]["ins"] == "cherry" and o.extras["mats"] is True
    bad = dict(item, config=dict(cfg, mat="eco", design="plain"))  # боковины из алькантары — только с алькантарой в центре
    r = client.post("/api/orders", json=order_body(items=[bad]), headers=ORIGIN)
    assert r.status_code == 422 and "конструктор" in r.json()["detail"].lower()
    front = dict(item, config=dict(cfg, salon={"kit": "front"}))
    assert client.post("/api/orders", json=order_body(items=[front]), headers=ORIGIN).status_code == 422
