"""Точка входа: uvicorn app.main:app

В проде nginx отдаёт статику сайта и проксирует /api/ и /admin/ сюда (deploy/nginx.conf).
В разработке (SERVE_STATIC=1) этот же сервер отдаёт и страницы сайта — всё на одном адресе http://127.0.0.1:8000."""
from __future__ import annotations

import logging
import pathlib
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .db import init_db
from .routers import admin, public

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("avtostil")

app = FastAPI(title="Автостиль API", docs_url=None if settings.is_production else "/api/docs",
              redoc_url=None, openapi_url=None if settings.is_production else "/api/openapi.json")

MAX_BODY = 64 * 1024  # заказ и заявка — пара килобайт; больше — ошибка или атака


class BodyLimit:
    """Режет слишком большие запросы до того, как их прочитает приложение (в проде то же делает nginx)."""

    def __init__(self, app_):
        self.app = app_

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers") or [])
        try:
            if int(headers.get(b"content-length", b"0")) > MAX_BODY:
                return await _send_413(send)
        except ValueError:
            return await _send_413(send)
        seen = 0

        async def limited():
            nonlocal seen
            msg = await receive()
            if msg["type"] == "http.request":
                seen += len(msg.get("body", b""))
                if seen > MAX_BODY:
                    raise HTTPException(413)
            return msg
        return await self.app(scope, limited, send)


async def _send_413(send):
    await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json")]})
    await send({"type": "http.response.body", "body": '{"detail":"Слишком большой запрос"}'.encode()})


ADMIN_CSP = ("default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; "
             "frame-ancestors 'none'; base-uri 'none'; object-src 'none'")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    path = request.url.path
    h = resp.headers
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
    if settings.site_url.startswith("https://"):
        h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    if path.startswith("/admin"):
        h["Content-Security-Policy"] = ADMIN_CSP
        h["X-Frame-Options"] = "DENY"
        h["Cache-Control"] = "no-store"
        h["X-Robots-Tag"] = "noindex, nofollow"
    elif path.startswith("/api/payments/mock"):
        h["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"
    elif path.startswith("/api"):
        h.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        h.setdefault("Cache-Control", "no-store")
        h["X-Robots-Tag"] = "noindex"
    return resp


app.add_middleware(BodyLimit)

FIELD_NAMES = {"name": "Имя", "phone": "Телефон", "email": "E-mail", "city": "Город", "items": "Состав заказа",
               "delivery": "Доставка", "payment": "Оплата", "inn": "ИНН", "company": "Организация", "vin": "VIN",
               "consent": "Согласие", "message": "Сообщение", "contact": "Телефон или e-mail", "qty": "Количество", "id": "Позиция"}


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    """Ошибки проверки — по-русски и по полям, чтобы форма подсветила нужное поле."""
    errors = []
    for e in exc.errors():
        loc = [str(x) for x in e.get("loc", []) if x not in ("body",)]
        field = loc[-1] if loc else ""
        msg = str(e.get("msg", ""))
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        elif e.get("type") in ("missing", "string_type", "literal_error", "int_parsing", "bool_parsing", "enum"):
            msg = f"Проверьте поле «{FIELD_NAMES.get(field, field)}»"
        elif e.get("type", "").startswith(("too_short", "too_long", "greater", "less")):
            msg = f"Проверьте поле «{FIELD_NAMES.get(field, field)}»"
        errors.append({"field": field, "path": loc, "message": msg})
    return JSONResponse({"detail": errors[0]["message"] if errors else "Проверьте данные формы", "errors": errors}, status_code=422)


@app.exception_handler(admin.LoginRequired)
async def login_required(request: Request, exc):
    nxt = request.url.path + (("?" + request.url.query) if request.url.query else "")
    return RedirectResponse("/admin/login?next=" + re.sub(r"[^\w/?=&%.-]", "", nxt), status_code=303)


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    if request.url.path.startswith("/admin") and exc.status_code in (403, 404) and request.method == "GET":
        from fastapi.responses import HTMLResponse
        import html as _h
        text = _h.escape(str(exc.detail if exc.detail and exc.detail not in ("Not Found", "Forbidden") else "Страница не найдена"))
        return HTMLResponse(f'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/admin/static/admin.css">'
                            f'<div class="page"><h1>{exc.status_code}</h1><p>{text}</p><p><a href="/admin/orders">К заказам</a></p></div>',
                            status_code=exc.status_code)
    # режим разработки со статикой: страница сайта не найдена — отдаём 404.html, как nginx на проде
    if (settings.serve_static and exc.status_code == 404 and request.method == "GET"
            and not request.url.path.startswith(("/api", "/admin")) and (settings.site_root / "404.html").is_file()):
        return FileResponse(settings.site_root / "404.html", status_code=404, headers={"Cache-Control": "no-cache"})
    detail = exc.detail if exc.detail not in (None, "Not Found") else "Не найдено"
    return JSONResponse({"detail": detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


app.include_router(public.router)
app.include_router(admin.router)
app.mount("/admin/static", StaticFiles(directory=str(pathlib.Path(__file__).parent / "static")), name="admin-static")


@app.on_event("startup")
def _startup():
    init_db()
    from .vin import vin_base
    st = vin_base.stats
    log.info("VIN: %s кодов производителя, %s правил VIN, %s кодов кузова (файлы: %s)",
             st["wmi"], st["vin_rules"], st["frame_codes"], ", ".join(st["files"]) or "нет")
    log.info("Оплата: %s, сайт: %s, статика: %s", settings.payment_provider, settings.site_url, "да" if settings.serve_static else "nginx")


# ---------- статика сайта для разработки ----------
# Отдаём только публичные файлы: страницы *.html в корне, css/, js/, assets/. backend/, tools/, content/, план/ и .git — нет.
PUBLIC_RE = re.compile(r"^(?:[\w-]+\.html|(?:css|js|assets)/[\w./ -]+)$")

if settings.serve_static:
    @app.get("/", include_in_schema=False)
    def _index():
        return FileResponse(settings.site_root / "index.html", headers={"Cache-Control": "no-cache"})

    @app.get("/{path:path}", include_in_schema=False)
    def _static(path: str):
        if ".." in path or not PUBLIC_RE.match(path):
            raise HTTPException(404)
        f = (settings.site_root / path).resolve()
        if settings.site_root not in f.parents or not f.is_file():
            raise HTTPException(404)
        return FileResponse(f, headers={"Cache-Control": "no-cache"} if f.suffix == ".html" else None)
