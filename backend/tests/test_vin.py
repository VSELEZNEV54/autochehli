import datetime as dt
import json

from app.catalog import catalog
from app.vin.decoder import VinBase, check_digit


def base(tmp_path, data=None):
    (tmp_path / "test.json").write_text(json.dumps(data or {}), encoding="utf-8")
    return VinBase(catalog, tmp_path)


SAMPLE = {
    "group": "test",
    "wmi": [{"code": "XTA", "maker": "АвтоВАЗ", "make": "Lada", "country": "RU", "brands": ["lada"], "year_pos10": True, "sources": ["x"]},
            {"code": "WDB", "maker": "Mercedes-Benz", "brands": ["mercedes"], "year_pos10": False, "sources": ["x"]}],
    "vin_rules": [
        {"mask": "XTA2190", "model": "Granta", "body": "седан", "slugs": ["lada_granta"], "years": [2011, 2030], "confidence": "confirmed", "sources": ["s"]},
        {"mask": "XTA219010", "model": "Granta", "body": "седан, 8 кл.", "slugs": ["lada_granta"], "years": [2011, 2030], "confidence": "official", "sources": ["s"]},
        {"mask": "XTAGFL", "model": "Vesta", "body": "седан", "slugs": [], "years": [2015, 2030], "confidence": "confirmed", "sources": ["s"]},
        {"mask": "XTA21", "model": "bad", "slugs": ["no_such_slug"], "sources": ["s"]},
    ],
    "frame_rules": [{"codes": ["NZE141", "ZRE142"], "model": "Corolla Fielder", "body": "E140", "years": [2006, 2012],
                     "slugs": ["toyota_corolla-fielder-141"], "confidence": "confirmed", "sources": ["s"]}],
}


def test_check_digit_reference_vin():
    assert check_digit("1M8GDM9AXKP042788") == "X"       # пример из стандарта NHTSA
    assert check_digit("1HGCM82633A004352") == "3"


def test_classify(tmp_path):
    b = base(tmp_path, SAMPLE)
    assert b.classify("xta219010k0123456")[0] == "vin"
    assert b.classify("XTA 2190-10K 0123456")[0] == "vin"
    assert b.classify("ХТА219010К0123456")[0] == "vin"     # кириллица вместо латиницы
    assert b.classify("XTA219010K")[0] == "vin_partial"
    assert b.classify("NZE141-6012345")[:2] == ("frame", "NZE141")
    assert b.classify("NZE141G-6012345")[:2] == ("frame", "NZE141")
    assert b.classify("DBA-NZE141G")[:2] == ("frame", "NZE141")
    assert b.classify("NZE1416012345")[:2] == ("frame", "NZE141")
    assert b.classify("GD1-1234567")[0] == "frame"          # форма номера кузова, кода нет в справочнике
    assert b.classify("hello")[0] == "invalid"


def test_decode_vin_rules_and_year(tmp_path):
    b = base(tmp_path, SAMPLE)
    d = b.decode("XTA219010K0123456")
    assert d["year"] == 2019 and d["vehicle"]["confidence"] == "official"     # самое точное правило
    assert [m["slug"] for m in d["matches"]] == ["lada_granta"] and d["level"] == "exact"
    assert "Lada Granta" in d["message"]
    v = b.decode("XTAGFL110H0123456")
    assert v["matches"] == [] and v["vehicle"]["model"] == "Vesta" and "сошьём на заказ" in v["message"]
    assert b.stats["dropped_slugs"] == 1


def test_year_not_used_when_maker_does_not_encode_it(tmp_path):
    b = base(tmp_path, SAMPLE)
    assert b.decode("WDB2110161A123456")["year"] is None
    assert b.decode("XW7BF4FK40S012345")["year"] is None    # «0» в 10-й позиции — не год


def test_year_cycle(tmp_path):
    b = base(tmp_path, SAMPLE)
    year, opts = b.model_year("XTA219010A0123456", None)
    assert year == 2010 and 1980 in opts
    nxt = dt.date.today().year + 1
    assert all(y <= nxt for y in opts)


def test_frame_decode(tmp_path):
    b = base(tmp_path, SAMPLE)
    d = b.decode("NZE141-6012345")
    assert d["kind"] == "frame" and [m["slug"] for m in d["matches"]] == ["toyota_corolla-fielder-141"]
    assert "Corolla Fielder" in d["message"]
    u = b.decode("ABC123-1234567")
    assert u["kind"] == "frame" and u["matches"] == [] and "не нашли" in u["message"]


def test_check_against_ordered_model(tmp_path):
    b = base(tmp_path, SAMPLE)
    assert b.check("lada_granta", "XTA219010K0123456")[0] == "ok"
    assert b.check("toyota_camry-xv70", "XTA219010K0123456")[0] == "mismatch"
    assert b.check("lada_granta", "nonsense")[0] == "bad"


def test_learned_rules_win(tmp_path):
    b = base(tmp_path, SAMPLE)
    learned = [{"key": "XTA21901", "slug": "lada_kalina", "years": [2019], "hits": 3}]
    if "lada_kalina" in catalog.models:
        d = b.decode("XTA219010K0123456", learned)
        assert d["vehicle"]["confidence"] == "learned" and d["matches"][0]["slug"] == "lada_kalina"


def test_real_sources_load_without_errors():
    """Справочник из app/vin/sources грузится, все лекала в правилах есть в каталоге."""
    b = VinBase(catalog)
    assert b.stats["wmi"] > 0
    for rules in b.vin_rules.values():
        for r in rules:
            assert all(s in catalog.models for s in r.slugs)


def test_no_fake_year_for_makers_without_year_code():
    """Renault России (X7L) после 2012 не кодирует год: сайт не должен писать клиенту выдуманный год."""
    from app.vin import vin_base as real
    d = real.decode("X7LRJC4D764000000")
    assert not d["year_sure"] and "2006" not in d["message"] and not d["problems"]
    assert "&year=" not in d["brand_url"]


def test_suggest_narrows_as_vin_is_typed():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    lada = client.get("/api/vin/suggest", params={"q": "XTA"}).json()
    assert lada["kind"] == "vin_prefix" and lada["items"] and all(i["brand"] == "lada" for i in lada["items"])
    granta = client.get("/api/vin/suggest", params={"q": "XTA2190"}).json()
    assert granta["items"] and all("Granta" in i["title"] for i in granta["items"]) and granta["more"] == 0
    assert len(granta["items"]) + granta["more"] < len(lada["items"]) + lada["more"]
    frame = client.get("/api/vin/suggest", params={"q": "NZE14"}).json()
    assert frame["kind"] == "frame_prefix" and any("Fielder" in i["title"] for i in frame["items"])
    full = client.get("/api/vin/suggest", params={"q": "XTA219010K0123456"}).json()
    assert full["kind"] == "vin" and full["items"]
    other_brand = client.get("/api/vin/suggest", params={"q": "XTA2190", "brand": "toyota"}).json()
    assert other_brand["items"] == []
    assert client.get("/api/vin/suggest", params={"q": "Camry"}).json()["items"] == []
