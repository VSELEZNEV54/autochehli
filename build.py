#!/usr/bin/env python3
"""Сборка прототипа.
1. Страницы из content/*.html: в начале файла JSON-шапка в комментарии
   <!-- {"title": "...", "description": "...", "page": "info"} -->, дальше HTML тела.
   Рендерятся через partials/layout.html в корень как <имя>.html.
2. Во всех страницах корня блоки между <!-- @header --> … <!-- /@header --> и
   <!-- @footer --> … <!-- /@footer --> заменяются на partials/header.html и partials/footer.html.
Запуск: python3 build.py"""
import re, json, pathlib
root = pathlib.Path(__file__).parent
parts = {n: (root / "partials" / f"{n}.html").read_text(encoding="utf-8").strip() for n in ("header", "footer", "layout")}
# 1. контентные страницы
for src in sorted((root / "content").glob("*.html")):
    text = src.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->", text, re.S)
    meta = json.loads(m.group(1)) if m else {}
    body = text[m.end():] if m else text
    body = re.sub(r"<!-- @include ([\w/.-]+) -->", lambda mm: (root / mm.group(1)).read_text(encoding="utf-8").strip(), body)
    html = parts["layout"]
    for k in ("title", "description", "page", "head", "scripts"):
        html = html.replace("{{" + k + "}}", meta.get(k, "" if k in ("head", "scripts") else src.stem))
    html = html.replace("{{body}}", body.strip())
    (root / f"{src.stem}.html").write_text(html, encoding="utf-8")
    print("rendered", src.stem + ".html")
# 2. шапка и футер
for page in root.glob("*.html"):
    s = page.read_text(encoding="utf-8"); out = s
    for n in ("header", "footer"):
        out = re.sub(rf"<!-- @{n} -->.*?<!-- /@{n} -->", lambda m, n=n: f"<!-- @{n} -->\n{parts[n]}\n<!-- /@{n} -->", out, flags=re.S)
    if out != s:
        page.write_text(out, encoding="utf-8")
print("done")
