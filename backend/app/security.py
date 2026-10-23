"""Защита: IP клиента за прокси, лимиты запросов, проверка Origin, антиспам, пароли (scrypt), TOTP, токены.
Сетевую защиту от DDoS даёт nginx (limit_req, limit_conn) и внешний фильтр — см. deploy/nginx.conf и DEPLOY.md."""
from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import secrets
import struct
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Iterable, Optional, Tuple

from fastapi import HTTPException, Request

from .config import settings


# ---------- IP клиента ----------
def _in_networks(ip: str, nets: Iterable[str]) -> bool:
    nets = list(nets)
    if ip in nets:  # имя хоста вместо адреса (unix-сокет, тесты)
        return True
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for n in nets:
        try:
            if addr in ipaddress.ip_network(n, strict=False):
                return True
        except ValueError:
            continue
    return False


def client_ip(request: Request) -> str:
    """X-Forwarded-For учитываем, только если запрос пришёл от нашего прокси (nginx). Иначе заголовок подделывается."""
    peer = request.client.host if request.client else ""
    if peer and _in_networks(peer, settings.trusted_proxies):
        real = request.headers.get("x-real-ip", "").strip()
        if real:
            return real
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[-1].strip()
    return peer or "unknown"


# ---------- лимиты ----------
class RateLimiter:
    """Скользящее окно в памяти процесса. На один IP и тип действия. Основной фильтр — nginx, это второй рубеж:
    защищает форму заказа и вход в админку даже без прокси."""

    def __init__(self) -> None:
        self._hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_gc = time.monotonic()

    def hit(self, bucket: str, key: str, limit: int, window: float) -> Tuple[bool, int]:
        now = time.monotonic()
        with self._lock:
            q = self._hits[(bucket, key)]
            while q and q[0] <= now - window:
                q.popleft()
            if len(q) >= limit:
                return False, int(q[0] + window - now) + 1
            q.append(now)
            if now - self._last_gc > 300:
                self._gc(now)
            return True, 0

    def _gc(self, now: float) -> None:
        self._last_gc = now
        for k in [k for k, q in self._hits.items() if not q or q[-1] < now - 3600]:
            del self._hits[k]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()

# bucket: (запросов, за секунд)
LIMITS = {
    "order": (6, 600),
    "request": (8, 600),
    "pay": (10, 600),
    "status": (60, 60),
    "vin": (40, 60),
    "suggest": (150, 60),   # подсказки при вводе: запрос на каждую паузу в наборе
    "login": (8, 900),
    "webhook": (120, 60),
}


def rate_limit(request: Request, bucket: str, key: Optional[str] = None) -> None:
    limit, window = LIMITS[bucket]
    ok, retry = limiter.hit(bucket, key or client_ip(request), limit, window)
    if not ok:
        raise HTTPException(429, detail="Слишком много запросов. Попробуйте через несколько минут или позвоните 8 (800) 775-32-60.",
                            headers={"Retry-After": str(retry)})


# ---------- Origin ----------
def check_origin(request: Request) -> None:
    """POST с чужого сайта отклоняем: защита от CSRF и от ботов, которые шлют формы напрямую."""
    origin = request.headers.get("origin") or ""
    if not origin:
        ref = request.headers.get("referer") or ""
        origin = "/".join(ref.split("/")[:3]) if ref.startswith("http") else ""
    allowed = {o.rstrip("/") for o in settings.allowed_origins} | {settings.site_url}
    if not settings.is_production:
        allowed |= {"http://127.0.0.1:8000", "http://localhost:8000"}
        if origin.startswith(("http://127.0.0.1:", "http://localhost:")):
            return
    if origin.rstrip("/") not in allowed:
        raise HTTPException(403, detail="Запрос отклонён: неизвестный источник")


# ---------- антиспам ----------
def spam_score(honeypot: str, elapsed_ms: Optional[int]) -> int:
    """0 — человек, ≥ 10 — бот. Скрытое поле заполняют только роботы; форму быстрее 3 секунд — тоже."""
    score = 0
    if honeypot:
        score += 10
    if elapsed_ms is not None and elapsed_ms < settings.min_form_seconds * 1000:
        score += 10
    return score


async def verify_captcha(token: str, ip: str) -> bool:
    """Яндекс SmartCaptcha — включается ключом SMARTCAPTCHA_SERVER_KEY. Без ключа проверка пропускается."""
    if not settings.smartcaptcha_server_key:
        return True
    if not token:
        return False
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.post("https://smartcaptcha.yandexcloud.net/validate",
                             data={"secret": settings.smartcaptcha_server_key, "token": token, "ip": ip})
            return r.status_code == 200 and r.json().get("status") == "ok"
    except Exception:
        # сервис капчи недоступен — не теряем заказ, остальные фильтры работают
        return True


# ---------- пароли ----------
_SCRYPT = dict(n=2 ** 15, r=8, p=1, maxmem=64 * 1024 * 1024, dklen=32)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, **_SCRYPT)
    return "scrypt$%d$%d$%d$%s$%s" % (_SCRYPT["n"], _SCRYPT["r"], _SCRYPT["p"],
                                       base64.b64encode(salt).decode(), base64.b64encode(dk).decode())


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt, dk = stored.split("$")
        if algo != "scrypt":
            return False
        calc = hashlib.scrypt(password.encode("utf-8"), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p),
                              maxmem=64 * 1024 * 1024, dklen=len(base64.b64decode(dk)))
        return hmac.compare_digest(calc, base64.b64decode(dk))
    except Exception:
        return False


DUMMY_HASH = hash_password(secrets.token_urlsafe(16))  # для выравнивания времени ответа при неверном логине


def password_problems(password: str) -> Optional[str]:
    if len(password) < 10:
        return "Пароль — не короче 10 символов"
    if password.lower() == password or password.upper() == password or not any(c.isdigit() for c in password):
        return "В пароле нужны строчные и заглавные буквы и цифры"
    return None


# ---------- TOTP (RFC 6238) — двухфакторный вход в админку ----------
def totp_new_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _totp_at(secret: str, counter: int) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    o = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000
    return f"{code:06d}"


def totp_verify(secret: str, code: str, at: Optional[float] = None, window: int = 1) -> bool:
    code = "".join(ch for ch in str(code) if ch.isdigit())
    if not secret or len(code) != 6:
        return False
    t = int((at or time.time()) // 30)
    return any(hmac.compare_digest(_totp_at(secret, t + d), code) for d in range(-window, window + 1))


def totp_uri(secret: str, username: str) -> str:
    from urllib.parse import quote
    return f"otpauth://totp/{quote('Автостиль')}:{quote(username)}?secret={secret}&issuer={quote('Автостиль')}"


# ---------- токены ----------
def new_token(n: int = 24) -> str:
    return secrets.token_urlsafe(n)


def token_hash(token: str) -> str:
    return hmac.new(settings.secret_key.encode(), token.encode(), hashlib.sha256).hexdigest()
