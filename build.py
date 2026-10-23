#!/usr/bin/env python3
"""Сборка прототипа.
1. Страницы из content/*.html: в начале файла JSON-шапка в комментарии
   <!-- {"title": "...", "description": "...", "page": "info"} -->, дальше HTML тела.
   Рендерятся через partials/layout.html в корень как <имя>.html.
   Блок вопросов <div … data-faq> с <details><summary>вопрос</summary><p>ответ</p></details> → разметка FAQPage в <head>.
2. Во всех страницах корня блоки между <!-- @header --> … <!-- /@header --> и
   <!-- @footer --> … <!-- /@footer --> заменяются на partials/header.html и partials/footer.html.
Запуск: python3 build.py"""
import re, json, html as H, pathlib
root = pathlib.Path(__file__).parent
parts = {n: (root / "partials" / f"{n}.html").read_text(encoding="utf-8").strip() for n in ("header", "footer", "layout")}
# 1. контентные страницы
for src in sorted((root / "content").glob("*.html")):
    text = src.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->", text, re.S)
    meta = json.loads(m.group(1)) if m else {}
    body = text[m.end():] if m else text
    body = re.sub(r"<!-- @include ([\w/.-]+) -->", lambda mm: (root / mm.group(1)).read_text(encoding="utf-8").strip(), body)
    faq = re.search(r"<div[^>]*\bdata-faq\b[^>]*>(.*?)</div>", body, re.S)
    if faq:
        txt = lambda s: H.unescape(re.sub(r"<[^>]+>", "", s)).strip()
        qa = [{"@type": "Question", "name": txt(q), "acceptedAnswer": {"@type": "Answer", "text": txt(a)}}
              for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p>(.*?)</p>", faq.group(1), re.S)]
        meta["head"] = meta.get("head", "") + '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": qa}, ensure_ascii=False) + "</script>"
    html = parts["layout"]
    meta.setdefault("js", [])
    meta["js"] = "\n".join(f'<script src="js/{j}?v=83"></script>' for j in meta["js"])
    meta.setdefault("canonical", "https://1avtochehol.ru/" + ("" if src.stem == "index" else src.stem + "/"))
    for k in ("title", "description", "page", "head", "scripts", "js", "canonical"):
        html = html.replace("{{" + k + "}}", meta.get(k, "" if k in ("head", "scripts", "js") else src.stem))
    html = html.replace("{{body}}", body.strip())
    # "base": "/" — для страниц, которые сервер отдаёт по любому адресу (404): относительные ссылки идут от корня.
    # <base> ставим сразу после <meta charset>, до стилей и скриптов, иначе они загрузятся от неверного адреса
    if meta.get("base"):
        html = re.sub(r"(<meta charset=[^>]*>)", lambda mm: mm.group(1) + f'\n  <base href="{meta["base"]}">', html, count=1)
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
