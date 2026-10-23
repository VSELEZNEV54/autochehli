"""Сервер считает цены по тем же данным, что и сайт. Если кто-то поменяет сочетания, доставку или цены в JS —
эти тесты покажут расхождение до того, как клиент увидит одну цену, а заплатит другую."""
import re

from app.catalog import CUSTOM_DESIGN_PRICE, CUSTOM_MAT_IDX, CUSTOM_SIDE_ALC_PRICE, DELIVERY, catalog
from app.config import settings

ROOT = settings.site_root


def test_variants_match_app_js():
    js = (ROOT / "js/app.js").read_text(encoding="utf-8")
    ids = re.findall(r'\{ n: \d+, id: "([a-z\-]+)", mat: \d', js)
    assert ids and ids == list(catalog.variants)


def test_delivery_matches_cart_page():
    js = (ROOT / "js/cart-page.js").read_text(encoding="utf-8")
    pairs = re.findall(r'\{ id: "(\w+)", name: "([^"]+)", sub: "[^"]*", price: (null|\d+) \}', js)
    assert {i: (n, None if p == "null" else int(p)) for i, n, p in pairs} == DELIVERY


def test_custom_material_index_matches_builder():
    js = (ROOT / "js/pages/custom.js").read_text(encoding="utf-8")
    found = dict(re.findall(r'(\w+): \{ name: "[^"]+",(?: full: "[^"]+",)? idx: (\d)', js))
    assert {k: int(v) for k, v in found.items()} == CUSTOM_MAT_IDX


def test_custom_extras_match_builder():
    js = (ROOT / "js/pages/custom.js").read_text(encoding="utf-8")
    block = re.search(r"const DESIGN_PRICE = \{(.*?)\};", js).group(1)
    found = {k: (int(a), int(b)) for k, a, b in re.findall(r"(\w+): \[(\d+), (\d+)\]", block)}
    assert found == CUSTOM_DESIGN_PRICE
    assert int(re.search(r"const SIDE_ALC_PRICE = (\d+);", js).group(1)) == CUSTOM_SIDE_ALC_PRICE
    app_js = (ROOT / "js/app.js").read_text(encoding="utf-8")
    assert dict(re.findall(r'\{ id: "([\w-]+)", name: "[^"]+", note: "[^"]*", price: (\d+)', app_js)) == {k: str(v[1]) for k, v in catalog.addons.items()}


def test_prices_present():
    assert len(catalog.models) > 400
    for m in catalog.models.values():
        assert len(m.p) == 3 and all(p > 0 for p in m.p)
