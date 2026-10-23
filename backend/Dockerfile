FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt && useradd --system --uid 1001 --home /app avtostil && mkdir -p /app/data && chown avtostil /app/data
COPY app ./app
USER avtostil
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=4)"
# 2 процесса; лимиты запросов в памяти считаются на процесс, основной фильтр — nginx.
# IP клиента берём из X-Real-IP от nginx (TRUSTED_PROXIES), поэтому --proxy-headers не нужен
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-proxy-headers", "--no-server-header"]
