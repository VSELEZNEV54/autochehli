"""Каталог для сервера — из тех же файлов, что и сайт: js/data.js (марки и лекала, генерирует tools/build_data.py)
и js/app.js (стандартные сочетания ALL_VARIANTS, доплаты ADDONS). Цены в заказе сервер всегда считает сам, цене из браузера не верит."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from .config import settings

MAT_NAME = ["Жаккард", "Экокожа", "Алькантара"]
DEFAULT_PRICES = [7975, 9375, 9975]

# Доставка — как в js/cart-page.js (DELIVERY) и на старом сайте; price None — по тарифу транспортной компании
DELIVERY = {
    "dpd": ("Транспортная компания DPD", None),
    "ems": ("EMS Почта России", None),
    "pickup": ("Самовывоз в Новосибирске", 0),
    "nsk": ("Курьер по Новосибирску", 385),
    "other": ("Другая транспортная компания", None),
}
# Материал конструктора → индекс цены лекала [жаккард, экокожа, алькантара] (js/pages/custom.js, MATS.idx)
CUSTOM_MAT_IDX = {"eco": 1, "perf": 1, "alc": 2, "jac": 0}
CUSTOM_MAT_NAME = {"eco": "Экокожа", "perf": "Экокожа с перфорацией", "alc": "Алькантара", "jac": "Жаккард"}
# Конструктор: доплата за рисунок [на экокоже и перфорации, на алькантаре] и за боковины из алькантары — «боковые поддержки в цвет серединки»
# (js/pages/custom.js, DESIGN_PRICE и SIDE_ALC_PRICE)
CUSTOM_DESIGN_PRICE = {"plain": (0, 0), "classic": (600, 600), "rhomb": (1000, 1500)}
CUSTOM_DESIGN_NAME = {"plain": "без рисунка", "classic": "классика", "rhomb": "ромб 35 мм"}
CUSTOM_SIDE_ALC_PRICE = 700


@dataclass
class Variant:
    id: str
    mat: int
    name: str
    label: str
    extra: int = 0

    @property
    def material(self) -> str:
        return MAT_NAME[self.mat]


@dataclass
class CarModel:
    s: str
    b: str
    f: str
    m: str
    g: str
    v: str
    y: str
    yr: int
    p: List[int]
    o: int = 0
    ru: str = ""

    def years_range(self) -> Tuple[int, int]:
        """Годы выпуска лекала: «2004–2011», «с 2011», «до 2012», пусто — все годы (как yearRange в app.js)."""
        y = self.y or ""
        r = re.search(r"(\d{4})\s*[–-]\s*(\d{4})", y)
        if r:
            return int(r.group(1)), int(r.group(2))
        m = re.match(r"^с\s*(\d{4})", y)
        if m:
            return int(m.group(1)), 9999
        m = re.match(r"^до\s*(\d{4})", y)
        if m:
            return 0, int(m.group(1))
        return 0, 9999


@dataclass
class Catalog:
    brands: Dict[str, dict] = field(default_factory=dict)
    models: Dict[str, CarModel] = field(default_factory=dict)
    variants: Dict[str, Variant] = field(default_factory=dict)
    addons: Dict[str, Tuple[str, int]] = field(default_factory=dict)
    families: Dict[str, List[CarModel]] = field(default_factory=dict)

    def brand_name(self, bid: str) -> str:
        return (self.brands.get(bid) or {}).get("n", bid)

    def gen_name(self, m: CarModel) -> str:
        return " ".join(x for x in (m.m, m.g) if x)

    def car_name(self, m: CarModel) -> str:
        return f"{self.brand_name(m.b)} {self.gen_name(m)}"

    def price(self, m: Optional[CarModel], v: Variant) -> int:
        return (m.p if m else DEFAULT_PRICES)[v.mat] + v.extra

    def custom_quote(self, m: CarModel, cfg: dict) -> dict:
        """Собранный в конструкторе комплект: цена = лекало за материал вставок + рисунок + боковины из алькантары + доплаты.
        Правила совместимости — как в конструкторе; несовместимое сочетание — ValueError."""
        mat, design, side = str(cfg.get("mat", "")), str(cfg.get("design", "")), str(cfg.get("side_mat", "eco"))
        if mat not in CUSTOM_MAT_IDX or design not in CUSTOM_DESIGN_PRICE or side not in ("eco", "alc"):
            raise ValueError("Неизвестный материал или рисунок")
        if (design == "classic" and mat == "jac") or (design == "rhomb" and mat not in ("eco", "alc")) or (side == "alc" and mat != "alc"):
            raise ValueError("Такое сочетание материала и рисунка не шьём")
        if (cfg.get("salon") or {}).get("kit", "full") != "full":
            raise ValueError("Передний ряд оформляем заявкой: стоимость рассчитает менеджер")
        opts = [str(x) for x in (cfg.get("opts") or [])]
        paid = [a for a in opts if a in self.addons and a != "sides"]
        if any(a in ("thread", "double") for a in paid) and design != "classic":
            raise ValueError("Отделочная нить и двойная настрочка — только с рисунком «Классика»")
        if "vseams" in paid and mat == "jac":
            raise ValueError("Вертикальные швы на жаккарде не делаем")
        price = m.p[CUSTOM_MAT_IDX[mat]] + CUSTOM_DESIGN_PRICE[design][1 if mat == "alc" else 0]
        price += CUSTOM_SIDE_ALC_PRICE if side == "alc" else 0
        price += sum(self.addons[a][1] for a in paid)
        return {"price": price, "material": CUSTOM_MAT_NAME[mat], "design": CUSTOM_DESIGN_NAME[design], "paid": paid,
                "mats": "mats" in opts, "install": "install" in opts}

    def old_price(self, m: Optional[CarModel], v: Variant) -> int:
        return m.o if m and m.o and m.o > self.price(m, v) else 0

    def year_match(self, m: CarModel, year: Optional[int]) -> bool:
        """Модельный год может на год расходиться с годом выпуска — допуск ±1, как в yearMatch на сайте."""
        if not year:
            return True
        a, b = m.years_range()
        return a - 1 <= year <= b + 1

    @staticmethod
    def url_pos(slug: str) -> str:
        return "car.html?m=" + slug

    @staticmethod
    def url_brand(bid: str) -> str:
        return "brand.html?b=" + bid


def _js_array(src: str, name: str) -> list:
    m = re.search(r"window\." + name + r"\s*=\s*(\[.*?\]);", src, re.S)
    if not m:
        raise RuntimeError(f"В js/data.js не найден {name}")
    return json.loads(m.group(1))


VARIANT_RE = re.compile(r'\{\s*n:\s*\d+,\s*id:\s*"([^"]+)",\s*mat:\s*(\d),\s*name:\s*"([^"]+)",\s*label:\s*"([^"]+)",[^}]*?extra:\s*(\d+)')
ADDON_RE = re.compile(r'\{\s*id:\s*"([\w-]+)",\s*name:\s*"([^"]+)",\s*note:\s*"[^"]*",\s*price:\s*(\d+)')


def load_catalog(root=None) -> Catalog:
    root = root or settings.site_root
    data = (root / "js" / "data.js").read_text(encoding="utf-8")
    cat = Catalog()
    for b in _js_array(data, "AS_BRANDS"):
        cat.brands[b["id"]] = b
    for raw in _js_array(data, "AS_MODELS"):
        m = CarModel(**{k: raw.get(k, "" if k not in ("yr", "o") else 0) for k in CarModel.__dataclass_fields__})
        m.p = list(raw["p"])
        cat.models[m.s] = m
        cat.families.setdefault(m.f, []).append(m)
    app_js = (root / "js" / "app.js").read_text(encoding="utf-8")
    block = re.search(r"const ALL_VARIANTS = \[(.*?)\];", app_js, re.S)
    for vid, mat, name, label, extra in VARIANT_RE.findall(block.group(1) if block else ""):
        cat.variants[vid] = Variant(vid, int(mat), name, label, int(extra))
    if not cat.variants:
        raise RuntimeError("В js/app.js не найдены стандартные сочетания ALL_VARIANTS — сервер не сможет посчитать цену")
    block = re.search(r"const ADDONS = \[(.*?)\];", app_js, re.S)
    for aid, name, price in ADDON_RE.findall(block.group(1) if block else ""):
        cat.addons[aid] = (name, int(price))
    return cat


catalog = load_catalog()
