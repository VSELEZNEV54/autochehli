"""Настройки из переменных окружения (и файла backend/.env, если он есть).
Полный список с пояснениями — backend/.env.example."""
from __future__ import annotations

import os
import pathlib
import secrets
from dataclasses import dataclass, field
from typing import List, Optional

BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent


def _load_dotenv(path: pathlib.Path) -> None:
    """Минимальный разбор .env: KEY=VALUE, комментарии #. Переменные окружения важнее файла."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key.strip(), value)


def _bool(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    return default if v is None or v == "" else v.strip().lower() in ("1", "true", "yes", "on", "да")


def _int(name: str, default: int) -> int:
    v = os.environ.get(name, "").strip()
    return int(v) if v else default


def _list(name: str, default: str = "") -> List[str]:
    return [x.strip() for x in os.environ.get(name, default).split(",") if x.strip()]


@dataclass
class Settings:
    env: str = "development"
    site_url: str = "http://127.0.0.1:8000"
    site_root: pathlib.Path = BACKEND_DIR.parent
    database_url: str = ""
    secret_key: str = ""
    serve_static: bool = True
    allowed_origins: List[str] = field(default_factory=list)
    trusted_proxies: List[str] = field(default_factory=lambda: ["127.0.0.1", "::1"])
    admin_ip_allowlist: List[str] = field(default_factory=list)
    # оплата
    payment_provider: str = "mock"           # mock | yookassa | none
    prepay_amount: int = 1000                # ₽, «предоплата от 1 000 ₽» со старого сайта
    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""
    yookassa_receipts: bool = False          # передавать чек 54-ФЗ («Чеки от ЮKassa» или своя касса)
    yookassa_vat_code: int = 1               # 1 — без НДС; ставку подтверждает бухгалтер
    yookassa_tax_system: Optional[int] = None
    yookassa_prepay_mode: str = "partial_prepayment"  # или advance — решает бухгалтер
    yookassa_check_ip: bool = True
    # уведомления
    telegram_bot_token: str = ""
    telegram_chat_ids: List[str] = field(default_factory=list)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: str = "starttls"               # starttls | ssl | none
    manager_emails: List[str] = field(default_factory=list)
    customer_emails: bool = True
    # антиспам
    smartcaptcha_server_key: str = ""
    smartcaptcha_client_key: str = ""
    min_form_seconds: int = 3
    # номера заказов: AS-100001, AS-100002…
    order_number_start: int = 100001

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def payments_online(self) -> bool:
        return self.payment_provider in ("mock", "yookassa")


def load_settings() -> Settings:
    _load_dotenv(BACKEND_DIR / ".env")
    env = os.environ.get("APP_ENV", "development").strip().lower()
    s = Settings(env=env)
    s.site_url = os.environ.get("SITE_URL", s.site_url).rstrip("/")
    root = os.environ.get("SITE_ROOT")
    if root:
        s.site_root = pathlib.Path(root).expanduser().resolve()
    data_dir = BACKEND_DIR / "data"
    s.database_url = os.environ.get("DATABASE_URL") or f"sqlite:///{data_dir / 'avtostil.db'}"
    s.secret_key = os.environ.get("SECRET_KEY", "")
    s.serve_static = _bool("SERVE_STATIC", env != "production")
    s.allowed_origins = _list("ALLOWED_ORIGINS", s.site_url)
    s.trusted_proxies = _list("TRUSTED_PROXIES", "127.0.0.1,::1")
    s.admin_ip_allowlist = _list("ADMIN_IP_ALLOWLIST")
    s.payment_provider = os.environ.get("PAYMENT_PROVIDER", "mock" if env != "production" else "yookassa").strip().lower()
    s.prepay_amount = _int("PREPAY_AMOUNT", s.prepay_amount)
    s.yookassa_shop_id = os.environ.get("YOOKASSA_SHOP_ID", "").strip()
    s.yookassa_secret_key = os.environ.get("YOOKASSA_SECRET_KEY", "").strip()
    s.yookassa_receipts = _bool("YOOKASSA_RECEIPTS", False)
    s.yookassa_vat_code = _int("YOOKASSA_VAT_CODE", 1)
    tax = os.environ.get("YOOKASSA_TAX_SYSTEM", "").strip()
    s.yookassa_tax_system = int(tax) if tax else None
    s.yookassa_prepay_mode = os.environ.get("YOOKASSA_PREPAY_MODE", s.yookassa_prepay_mode).strip()
    s.yookassa_check_ip = _bool("YOOKASSA_CHECK_IP", True)
    s.telegram_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    s.telegram_chat_ids = _list("TELEGRAM_CHAT_IDS")
    s.smtp_host = os.environ.get("SMTP_HOST", "").strip()
    s.smtp_port = _int("SMTP_PORT", 587)
    s.smtp_user = os.environ.get("SMTP_USER", "").strip()
    s.smtp_password = os.environ.get("SMTP_PASSWORD", "")
    s.smtp_from = os.environ.get("SMTP_FROM", s.smtp_user).strip()
    s.smtp_tls = os.environ.get("SMTP_TLS", "starttls").strip().lower()
    s.manager_emails = _list("MANAGER_EMAILS")
    s.customer_emails = _bool("CUSTOMER_EMAILS", True)
    s.smartcaptcha_server_key = os.environ.get("SMARTCAPTCHA_SERVER_KEY", "").strip()
    s.smartcaptcha_client_key = os.environ.get("SMARTCAPTCHA_CLIENT_KEY", "").strip()
    s.min_form_seconds = _int("MIN_FORM_SECONDS", 3)
    s.order_number_start = _int("ORDER_NUMBER_START", s.order_number_start)
    validate(s)
    return s


def validate(s: Settings) -> None:
    """В проде не стартуем с небезопасной конфигурацией — лучше упасть при запуске, чем принять оплату мимо кассы."""
    problems = []
    if s.payment_provider not in ("mock", "yookassa", "none"):
        problems.append("PAYMENT_PROVIDER: mock, yookassa или none")
    if s.payment_provider == "yookassa" and not (s.yookassa_shop_id and s.yookassa_secret_key):
        problems.append("для ЮKassa нужны YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY")
    if s.is_production:
        if len(s.secret_key) < 32:
            problems.append("SECRET_KEY — случайная строка от 32 символов (python3 -c 'import secrets;print(secrets.token_urlsafe(48))')")
        if s.payment_provider == "mock":
            problems.append("PAYMENT_PROVIDER=mock в проде запрещён — это тестовая касса")
        if not s.site_url.startswith("https://"):
            problems.append("SITE_URL в проде — только https://")
    if problems:
        raise RuntimeError("Ошибка настроек бэкенда:\n- " + "\n- ".join(problems))
    if not s.secret_key:
        # для разработки — случайный ключ на каждый запуск (сессии админки сбросятся при перезапуске)
        s.secret_key = secrets.token_urlsafe(48)


settings = load_settings()
