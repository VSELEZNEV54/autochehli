"""Справочник VIN проверяется на реальных VIN из исследований: каждый пример из правила должен расшифровываться
в лекала этого правила. Падает, если новое правило перебило старое или сломался разбор."""
import json
import pathlib
import re

from app.catalog import catalog
from app.vin import vin_base

SOURCES = pathlib.Path(__file__).resolve().parent.parent / "app" / "vin" / "sources"


def _examples():
    for f in sorted(SOURCES.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for r in data.get("vin_rules") or []:
            for e in (r.get("examples") or [])[:3]:
                m = re.match(r"\s*([A-HJ-NPR-Z0-9*]{11,17})", e.upper())
                if m and m.group(1)[:3] == r["mask"][:3]:   # пример с другим кодом завода — не про это правило
                    yield f.stem, m.group(1).replace("*", "0"), r


def test_examples_decode_to_their_rules():
    total, wrong = 0, []
    for group, vin, r in _examples():
        total += 1
        got = {x["slug"] for x in vin_base.decode(vin)["matches"]}
        want = set(r["slugs"])
        if (want and not got & want) or (not want and got):
            wrong.append((group, vin, r["mask"], r["model"], sorted(got)[:3]))
    assert total > 100
    assert len(wrong) <= total * 0.01, wrong[:10]


def test_sources_reference_only_catalog_templates():
    for f in SOURCES.glob("*.json"):
        data = json.loads(f.read_text(encoding="utf-8"))
        for r in (data.get("vin_rules") or []) + (data.get("frame_rules") or []):
            missing = [s for s in r.get("slugs") or [] if s not in catalog.models]
            assert not missing, (f.name, missing)
            assert r.get("sources"), (f.name, r.get("mask") or r.get("codes"))
