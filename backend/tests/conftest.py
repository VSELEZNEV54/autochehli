import os
import pathlib
import sys
import tempfile

_tmp = tempfile.mkdtemp(prefix="avtostil-test-")
os.environ.update({
    "APP_ENV": "test",
    "DATABASE_URL": f"sqlite:///{_tmp}/test.db",
    "SITE_URL": "http://127.0.0.1:8000",
    "PAYMENT_PROVIDER": "mock",
    "SECRET_KEY": "test-secret-key-test-secret-key-0123456789",
    "TELEGRAM_BOT_TOKEN": "", "SMTP_HOST": "", "SMARTCAPTCHA_SERVER_KEY": "",
})
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.security import limiter  # noqa: E402

ORIGIN = {"Origin": "http://127.0.0.1:8000"}


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    init_db()
    limiter.reset()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def order_body(**over):
    body = {
        "items": [{"id": "cover:toyota_camry-xv70:perf-black", "qty": 1}],
        "customer": {"name": "Иван Петров", "phone": "8 913 123-45-67", "email": "ivan@example.com", "city": "Новосибирск"},
        "delivery": "dpd", "payment": "prepay", "vin": "", "consent": True,
        "meta": {"page": "/cart.html", "elapsed_ms": 30000, "hp": ""},
    }
    body.update(over)
    return body
