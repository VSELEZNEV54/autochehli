"""Расшифровка VIN и номеров кузова → марка, модель, кузов и лекала нашего каталога.

Источники данных — JSON в app/vin/sources/ (у каждого правила есть ссылки на источник и уровень достоверности):
  wmi-world.json — мировой справочник кодов производителя (позиции 1–3) и стран;
  <группа марок>.json — правила VDS (позиции 4–8 и далее) и коды кузова праворульных японских машин;
  overrides.json — поправки поверх исследований (самый высокий приоритет), у каждой — объяснение и источник.
Плюс таблица vin_learned в базе: VIN, которые менеджер сверил с лекалом в админке. Они важнее правил из справочника.

Структура VIN (ISO 3779): 1–3 WMI, 4–9 VDS (9 — контрольный знак у Северной Америки и Китая), 10 — модельный год
(есть не у всех производителей), 11 — завод, 12–17 — серийный номер. Для расшифровки модели хватает первых 9–11 символов."""
from __future__ import annotations

import datetime as dt
import json
import logging
import pathlib
import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

from ..catalog import Catalog, catalog as default_catalog

log = logging.getLogger("avtostil.vin")
SOURCES = pathlib.Path(__file__).parent / "sources"

VIN_CHARS = set("ABCDEFGHJKLMNPRSTUVWXYZ0123456789")
YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789"   # 30-летний цикл: A — 1980 и 2010 … 9 — 2009 и 2039
_TRANSLIT = dict(zip("ABCDEFGHJKLMNPRSTUVWXYZ", [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 7, 9, 2, 3, 4, 5, 6, 7, 8, 9]))
_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
# Коды производителя, у которых в VIN зашит код кузова (исследование japan-other: отзывные списки UOKiK, объявления autospot)
FRAME_IN_VIN = {"JMB", "JMY", "Z8T", "X2M", "XMC", "MMC", "MMB"}
CONF_ORDER = {"learned": 4, "official": 3, "confirmed": 2, "probable": 1}
# Кириллица, похожая на латиницу, — частая опечатка при вводе VIN
_CYR = str.maketrans("АВЕКМНОРСТХУ", "ABEKMHOPCTXY")


def check_digit(vin: str) -> str:
    total = sum((int(c) if c.isdigit() else _TRANSLIT[c]) * w for c, w in zip(vin, _WEIGHTS))
    r = total % 11
    return "X" if r == 10 else str(r)


def check_digit_required(vin: str) -> bool:
    """Контрольный знак обязателен в Северной Америке (1–5) и Китае (L)."""
    return vin[:1] in "12345L"


@dataclass
class VinRule:
    mask: str
    slugs: List[str]
    model: str = ""
    body: str = ""
    detail: str = ""
    years: Optional[Tuple[int, int]] = None
    confidence: str = "probable"
    sources: List[str] = field(default_factory=list)
    group: str = ""

    @property
    def specificity(self) -> int:
        return sum(1 for c in self.mask[3:] if c != "?")

    def matches(self, vin: str) -> bool:
        for i, m in enumerate(self.mask):
            if m == "?":
                continue
            if i >= len(vin) or vin[i] != m:
                return False
        return True


@dataclass
class FrameRule:
    codes: List[str]
    slugs: List[str]
    model: str = ""
    body: str = ""
    note: str = ""
    years: Optional[Tuple[int, int]] = None
    confidence: str = "probable"
    sources: List[str] = field(default_factory=list)
    group: str = ""


def _years(v) -> Optional[Tuple[int, int]]:
    if isinstance(v, (list, tuple)) and len(v) == 2:
        a = int(v[0]) if v[0] else 0
        b = int(v[1]) if v[1] else 9999
        return (a, b)
    return None


class VinBase:
    def __init__(self, cat: Optional[Catalog] = None, sources: pathlib.Path = SOURCES):
        self.cat = cat or default_catalog
        self.wmi: Dict[str, dict] = {}
        self.countries: List[dict] = []
        self.country_names: Dict[str, str] = {}
        self.vin_rules: Dict[str, List[VinRule]] = {}
        self.frame_rules: Dict[str, List[FrameRule]] = {}
        self.legend: List[dict] = []
        self.stats = {"wmi": 0, "vin_rules": 0, "frame_codes": 0, "dropped_slugs": 0, "bad_rules": 0, "files": []}
        self._load(sources)

    # ---------- загрузка ----------
    def _valid_slugs(self, slugs: Iterable[str]) -> List[str]:
        out = []
        for s in slugs or []:
            if s in self.cat.models:
                out.append(s)
            else:
                self.stats["dropped_slugs"] += 1
                log.warning("VIN: лекала %s нет в каталоге — пропущено", s)
        return out

    def _add_wmi(self, w: dict, priority: int) -> None:
        code = str(w.get("code", "")).upper().strip()
        if len(code) != 3 or not set(code) <= VIN_CHARS:
            self.stats["bad_rules"] += 1
            return
        brands = [b for b in (w.get("brands") or []) if b in self.cat.brands]
        cur = self.wmi.get(code)
        entry = {"code": code, "maker": w.get("maker", ""), "make": w.get("make", ""), "country": w.get("country", ""),
                 "brands": brands, "year_pos10": w.get("year_pos10"), "year_pos": w.get("year_pos") or (cur or {}).get("year_pos") or 10,
                 "note": w.get("note", ""),
                 "sources": list(w.get("sources") or []), "_p": priority}
        if cur is None or priority > cur["_p"]:
            if cur:  # марки берём из более точного источника (даже пустой список), остальное дополняем
                if "brands" not in w:
                    entry["brands"] = cur["brands"]
                entry["make"] = entry["make"] or cur["make"]
                entry["maker"] = entry["maker"] or cur["maker"]
                entry["country"] = entry["country"] or cur["country"]
                if entry["year_pos10"] is None:
                    entry["year_pos10"] = cur["year_pos10"]
                entry["sources"] = list(dict.fromkeys(entry["sources"] + cur["sources"]))
            self.wmi[code] = entry
        else:
            cur["brands"] = list(dict.fromkeys(cur["brands"] + brands))
            cur["sources"] = list(dict.fromkeys(cur["sources"] + list(w.get("sources") or [])))
            if cur["year_pos10"] is None:
                cur["year_pos10"] = w.get("year_pos10")

    def _load(self, folder: pathlib.Path) -> None:
        files = sorted(folder.glob("*.json")) if folder.is_dir() else []
        # порядок важности: справочник прототипа < мировой справочник < исследование по маркам < поправки
        prio = lambda p: {"site-wmi": 0, "wmi-world": 1, "overrides": 3}.get(p.stem, 2)
        for path in sorted(files, key=prio):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as e:
                log.error("VIN: не прочитан %s: %s", path.name, e)
                continue
            self.stats["files"].append(path.name)
            group = data.get("group") or path.stem
            if prio(path) == 1:
                self.countries = data.get("countries") or []
                self.country_names = {c["iso"]: c["country"] for c in self.countries if c.get("iso") and c.get("country")}
            for w in data.get("wmi") or []:
                self._add_wmi(w, prio(path))
            for r in data.get("vin_rules") or []:
                mask = str(r.get("mask", "")).upper().replace("*", "?").strip()
                if not (4 <= len(mask) <= 11) or not set(mask) <= VIN_CHARS | {"?"} or "?" in mask[:3]:
                    self.stats["bad_rules"] += 1
                    log.warning("VIN: плохая маска %r в %s", mask, path.name)
                    continue
                rule = VinRule(mask=mask, slugs=self._valid_slugs(r.get("slugs")), model=r.get("model", ""),
                               body=r.get("body", ""), detail=r.get("detail", ""), years=_years(r.get("years")),
                               confidence=r.get("confidence", "probable"), sources=list(r.get("sources") or []), group=group)
                self.vin_rules.setdefault(mask[:3], []).append(rule)
                self.stats["vin_rules"] += 1
            for r in data.get("frame_rules") or []:
                codes = [re.sub(r"[^A-Z0-9]", "", str(c).upper()) for c in (r.get("codes") or [])]
                codes = [c for c in codes if 2 <= len(c) <= 8]
                if not codes:
                    self.stats["bad_rules"] += 1
                    continue
                rule = FrameRule(codes=codes, slugs=self._valid_slugs(r.get("slugs")), model=r.get("model", ""),
                                 body=r.get("body", ""), note=r.get("note", ""), years=_years(r.get("years")),
                                 confidence=r.get("confidence", "probable"), sources=list(r.get("sources") or []), group=group)
                for c in codes:
                    self.frame_rules.setdefault(c, []).append(rule)
            for lg in data.get("position_legend") or []:
                self.legend.append(dict(lg, group=group))
        self.stats["wmi"] = len(self.wmi)
        self.stats["frame_codes"] = len(self.frame_rules)
        self._frame_codes_sorted = sorted(self.frame_rules, key=len, reverse=True)

    # ---------- разбор строки ----------
    def classify(self, raw: str) -> Tuple[str, str, str]:
        """→ (тип, VIN или код кузова, исходная строка в верхнем регистре). Типы: vin, vin_partial, frame, invalid."""
        s = str(raw or "").strip().upper().translate(_CYR)
        s = re.sub(r"\s+", " ", s)[:40]
        compact = re.sub(r"[\s\-_.]", "", s)
        if len(compact) == 17 and set(compact) <= VIN_CHARS:
            return "vin", compact, s
        # код кузова: NZE141, GD1, CW5W, M900A, у Mazda бывает из одних букв — GHEFW, KFEP
        m = re.match(r"^(?:[A-Z0-9]{2,3}-)?([A-Z][A-Z0-9]{1,7})(?:[\s\-]+(\d{3,8}))?$", s)
        if m:
            code = self._frame_code(m.group(1))
            if code:
                return "frame", code, s
            if m.group(2):  # форма «КОД-НОМЕР», но кода нет в справочнике
                return "frame", m.group(1), s
        if 9 <= len(compact) <= 16 and set(compact) <= VIN_CHARS and compact[:3] in self.wmi:
            return "vin_partial", compact, s
        for code in self._frame_codes_sorted:  # номер кузова без дефиса: NZE1416012345
            rest = compact[len(code):]
            if compact.startswith(code) and rest.isdigit() and len(rest) >= 5:
                return "frame", code, s
        if 9 <= len(compact) <= 16 and set(compact) <= VIN_CHARS:
            return "vin_partial", compact, s
        return "invalid", compact, s

    def _frame_code(self, token: str) -> str:
        """NZE141G → NZE141 (буква кузова в номере не пишется), GD1 → GD1."""
        t = token.upper()
        while t:
            if t in self.frame_rules:
                return t
            if t[-1].isalpha() and len(t) > 2:
                t = t[:-1]
            else:
                break
        return ""

    def model_year(self, vin: str, wmi: Optional[dict]) -> Tuple[Optional[int], List[int]]:
        """Модельный год по 10-му символу (у европейских и российских Ford — по 11-му) → (год, все годы 30-летнего цикла).
        year_pos10 у кода производителя: true — год кодируется наверняка, false — не кодируется, null — неизвестно."""
        pos = int((wmi or {}).get("year_pos") or 10)
        if len(vin) < pos or (wmi and wmi.get("year_pos10") is False):
            return None, []
        i = YEAR_CODES.find(vin[pos - 1])
        if i < 0:
            return None, []
        max_year = dt.date.today().year + 1
        opts = [y for y in (1980 + i, 2010 + i, 2040 + i) if y <= max_year]
        if vin[:1] in "12345" and len(vin) >= 7:
            # Северная Америка: буква в 7-й позиции — 2010–2039, цифра — 1980–2009
            opts = [y for y in opts if (y >= 2010) == vin[6].isalpha()] or opts
        return (opts[-1] if opts else None), opts

    def country(self, vin: str) -> str:
        two = vin[:2]
        order = "ABCDEFGHJKLMNPRSTUVWXYZ1234567890"
        for c in self.countries:
            a, b = str(c.get("from", "")), str(c.get("to", ""))
            if len(a) == 2 and len(b) == 2 and a[0] == two[0] == b[0]:
                try:
                    if order.index(a[1]) <= order.index(two[1]) <= order.index(b[1]):
                        return c.get("country", "")
                except ValueError:
                    continue
        return ""

    # ---------- расшифровка ----------
    def decode(self, raw: str, learned: Optional[List[dict]] = None) -> dict:
        kind, value, upper = self.classify(raw)
        res = {"input": str(raw or "")[:40], "kind": kind, "vin": "", "frame_code": "", "wmi": None, "country": "",
               "year": None, "year_sure": False, "years_possible": [], "check_digit": None, "vehicle": None, "matches": [],
               "level": "none", "brand_url": "", "problems": [], "message": ""}
        if kind == "invalid":
            if len(value) == 17 and set(value) & set("IOQ"):
                res["problems"].append("В VIN не бывает букв I, O и Q — вероятно, это цифры 1 и 0.")
            res["message"] = ("VIN — 17 символов: латинские буквы без I, O, Q и цифры. Для подбора хватит первых 11 символов. "
                              "У праворульного «японца» — номер кузова, например NZE141-6012345.")
            return res
        if kind == "frame":
            return self._decode_frame(res, value, learned or [])
        return self._decode_vin(res, value, learned or [])

    def _wmi_info(self, code: str) -> Optional[dict]:
        w = self.wmi.get(code)
        if not w:
            return None
        info = {k: v for k, v in w.items() if not k.startswith("_")}
        info["brand_names"] = [self.cat.brand_name(b) for b in info["brands"]]
        info["country"] = self.country_names.get(info["country"], info["country"])
        return info

    def _decode_vin(self, res: dict, vin: str, learned: List[dict]) -> dict:
        res["vin"] = vin
        wmi = self._wmi_info(vin[:3])
        res["wmi"] = wmi
        res["country"] = (wmi or {}).get("country", "") or self.country(vin)
        if len(vin) >= 9:
            req = check_digit_required(vin)
            if len(vin) == 17:
                ok = check_digit(vin) == vin[8]
                res["check_digit"] = {"required": req, "valid": ok}
                if req and not ok:
                    res["problems"].append("Контрольный 9-й символ не сходится — проверьте, нет ли опечатки в VIN.")
        year, years = self.model_year(vin, wmi)

        # 1) подтверждённые менеджером
        best: List[Tuple[str, List[str], dict]] = []
        for lr in learned:
            if vin[:8] == lr["key"] and lr["slug"] in self.cat.models:
                ly = lr.get("years") or []
                if year and ly and min(abs(year - y) for y in ly) > 2:
                    continue
                best.append(("learned", [lr["slug"]], {"model": "", "body": "", "detail": f"сверено менеджером: {lr.get('hits', 1)}",
                                                     "confidence": "learned", "sources": []}))
        # 2) правила справочника: сначала фильтр по году, потом самые точные
        if not best:
            rules = [r for r in self.vin_rules.get(vin[:3], []) if r.matches(vin)]
            if years:
                # сначала точное попадание модельного года в годы правила, потом с допуском ±1 (смена поколения посреди года)
                exact = [r for r in rules if not r.years or any(r.years[0] <= y <= r.years[1] for y in years)]
                near = [r for r in rules if not r.years or any(r.years[0] - 1 <= y <= r.years[1] + 1 for y in years)]
                rules = (exact if any(r.years for r in exact) else near) or near or rules
            if rules:
                top = max(r.specificity for r in rules)
                rules = [r for r in rules if r.specificity == top]
                rules.sort(key=lambda r: -CONF_ORDER.get(r.confidence, 0))
                if len(years) > 1 and rules[0].years:  # выбираем цикл года, который подходит под правило
                    y0, y1 = rules[0].years
                    fitting = [y for y in years if y0 - 1 <= y <= y1 + 1]
                    if fitting:
                        year = fitting[-1]
                for r in rules:
                    best.append((r.confidence, r.slugs, {"model": r.model, "body": r.body, "detail": r.detail,
                                                         "confidence": r.confidence, "sources": r.sources[:3]}))
        # 3) у Mitsubishi в символах 6–9 (у старых и тайских — 6–8) VIN стоит код кузова, как в номере кузова «японца»
        if not best and vin[:3] in FRAME_IN_VIN and len(vin) >= 8:
            for code in (vin[5:9], vin[5:8]):
                frs = self.frame_rules.get(code)
                if frs:
                    for r in frs:
                        best.append((r.confidence, r.slugs, {"model": r.model, "body": r.body, "detail": f"по коду кузова {code} в VIN",
                                                             "confidence": "probable" if r.confidence == "probable" else "confirmed",
                                                             "sources": r.sources[:3]}))
                    break
        res["year"], res["years_possible"] = year, years
        res["year_sure"] = bool(year) and (wmi or {}).get("year_pos10") is True
        if best:
            info = dict(best[0][2])
            info["model"] = info["model"] or ", ".join(dict.fromkeys(self.cat.models[s].m for s in best[0][1]))
            res["vehicle"] = info
        slugs = list(dict.fromkeys(s for _, sl, _ in best for s in sl))
        brands = (wmi or {}).get("brands") or []
        self._fill_matches(res, slugs, brands, year)
        res["message"] = self._message(res, wmi)
        return res

    def _decode_frame(self, res: dict, code: str, learned: List[dict]) -> dict:
        res["frame_code"] = code
        best = [lr["slug"] for lr in learned if lr["key"] == "FRAME:" + code and lr["slug"] in self.cat.models]
        rules = self.frame_rules.get(code, [])
        if best:
            res["vehicle"] = {"model": ", ".join(dict.fromkeys(self.cat.models[s].m for s in best)), "body": code,
                              "detail": "сверено менеджером", "confidence": "learned", "sources": []}
        elif rules:
            r = sorted(rules, key=lambda r: -CONF_ORDER.get(r.confidence, 0))[0]
            res["vehicle"] = {"model": " / ".join(dict.fromkeys(x.model for x in rules if x.model)), "body": r.body,
                              "detail": r.note, "confidence": r.confidence, "sources": r.sources[:3],
                              "years": list(r.years) if r.years else None}
        slugs = list(dict.fromkeys(best + [s for r in rules for s in r.slugs]))
        brands = list(dict.fromkeys(self.cat.models[s].b for s in slugs))
        self._fill_matches(res, slugs, brands, None)
        if not slugs and rules:
            res["level"] = "model"
        res["message"] = self._message(res, None)
        return res

    def _fill_matches(self, res: dict, slugs: List[str], brands: List[str], year: Optional[int]) -> None:
        cat = self.cat
        models = [cat.models[s] for s in slugs if s in cat.models]
        if year and models:
            fit = [m for m in models if cat.year_match(m, year)]
            if fit:
                models = fit
            elif res.get("year_sure"):
                res["problems"].append(f"Модельный год по VIN — {year}, а лекала этой модели рассчитаны на другие годы.")
        res["matches"] = [{
            "slug": m.s, "brand": m.b, "title": cat.car_name(m), "generation": m.g, "salon": m.v, "years": m.y,
            "url": cat.url_pos(m.s), "price_from": min(m.p),
        } for m in models]
        if models:
            res["level"] = "exact" if len({m.f for m in models}) == 1 else "model"
        elif brands:
            res["level"] = "brand"
        elif res.get("wmi"):
            res["level"] = "maker"
        if len(brands) == 1:
            q = f"&vin={res['vin']}" if res.get("vin") else ""
            res["brand_url"] = cat.url_brand(brands[0]) + q + (f"&year={year}" if year and res.get("year_sure") else "")

    def _message(self, res: dict, wmi: Optional[dict]) -> str:
        v, ms = res.get("vehicle"), res["matches"]
        year = res["year"] if res.get("year_sure") else None   # год без уверенности клиенту не называем
        ytxt = f", {year} модельный год" if year else ""
        probable = (v or {}).get("confidence") == "probable"
        sure = "вероятно, " if probable else ""          # после двоеточия: «Номер кузова GD1: вероятно, …»
        vin_is = "По VIN это, вероятно," if probable else "По VIN это"
        if res["kind"] == "frame":
            if ms:
                fams = {self.cat.models[m["slug"]].f for m in ms}
                what = ms[0]["title"] if len({m["title"] for m in ms}) == 1 else v["model"]
                pick = "модель и вариант салона" if len(fams) > 1 else "вариант салона"
                return f"Номер кузова {res['frame_code']}: {sure}{what}. Выберите {pick} — комплектацию уточнит менеджер."
            if v:
                return f"Номер кузова {res['frame_code']}: {sure}{v['model']} — лекал на эту модель пока нет, сошьём на заказ."
            return "Похоже на номер кузова праворульного автомобиля, но код не нашли в справочнике. Выберите марку и модель — менеджер сверит номер кузова с лекалом."
        names = (wmi or {}).get("brand_names") or []
        # завод собирал много марок (ЗАЗ, «Автотор») — называем завод, а не список марок
        brand = ", ".join(names) if 0 < len(names) <= 3 else (wmi or {}).get("maker") or (wmi or {}).get("make") or ""
        if ms:
            names = list(dict.fromkeys(m["title"] for m in ms))
            what = names[0] if len(names) == 1 else (v or {}).get("model") or " или ".join(names[:3])
            mb = self.cat.brand_name(ms[0]["brand"])
            if not what.lower().startswith(mb.lower()):
                what = f"{mb} {what}"
            return f"{vin_is} {what}{ytxt}. Комплектацию салона уточнит менеджер."
        if v and v.get("model"):
            return f"{vin_is} {brand} {v['model']}{ytxt} — готовых лекал на эту модель нет, сошьём на заказ.".replace("  ", " ")
        if wmi and wmi.get("brands"):
            return f"По VIN это {brand}{ytxt}. Модель по VIN не определилась — выберите её в каталоге, менеджер сверит VIN с лекалом."
        if wmi:
            return f"По VIN это {brand or 'производитель ' + wmi['code']}{ytxt} — такой марки нет в каталоге, сошьём чехлы на заказ."
        return f"Код производителя {res['vin'][:3]} не найден в справочнике{ytxt}. Выберите автомобиль вручную или оставьте VIN менеджеру."

    # ---------- подсказки по мере ввода ----------
    def _item(self, m, why: str, sure: bool) -> dict:
        return {"slug": m.s, "brand": m.b, "title": self.cat.car_name(m), "generation": m.g, "salon": m.v, "years": m.y,
                "url": self.cat.url_pos(m.s), "price_from": min(m.p), "why": why, "sure": sure}

    def suggest(self, raw: str, learned: Optional[List[dict]] = None, brand: str = "", limit: int = 8) -> dict:
        """Подсказки, пока клиент вводит VIN или номер кузова: «XTA» → лекала Lada, «XTA2190» → Granta седан,
        «NZE14» → Corolla Axio/Fielder. Полный или почти полный номер — обычная расшифровка."""
        s = str(raw or "").strip().upper().translate(_CYR)[:40]
        q = re.sub(r"[\s\-_.]", "", s)
        out = {"query": q, "kind": "none", "wmi": None, "items": [], "more": 0, "other": [], "message": ""}
        if len(q) < 2:
            return out
        items: List[dict] = []
        other: List[str] = []           # модели без лекал: «сошьём на заказ»

        kind, value, _ = self.classify(s)
        if kind in ("vin", "vin_partial") or (kind == "frame" and value in self.frame_rules):
            d = self.decode(s, learned)
            out.update(kind=d["kind"], wmi=d.get("wmi"), message=d["message"])
            why = ("кузов " + d["frame_code"]) if d["kind"] == "frame" else "по VIN"
            sure = (d.get("vehicle") or {}).get("confidence") != "probable"
            items = [self._item(self.cat.models[m["slug"]], why, sure) for m in d["matches"]]
            if not items and d.get("vehicle") and d["vehicle"].get("model"):
                other.append(d["vehicle"]["model"])
        else:
            # начало VIN: правила, с которыми введённые символы не противоречат
            if len(q) >= 3 and set(q) <= VIN_CHARS and q[:3] in self.wmi:
                w = self._wmi_info(q[:3])
                out.update(kind="vin_prefix", wmi=w)
                year = None
                if w and w.get("year_pos10") is True:
                    year = self.model_year(q, w)[0]
                scored = []
                for lr in learned or []:
                    if not lr["key"].startswith("FRAME:") and all(a == b for a, b in zip(lr["key"], q)) and lr["slug"] in self.cat.models:
                        scored.append(((1, len(q), 4, 9999), [lr["slug"]], "", "learned"))
                for r in self.vin_rules.get(q[:3], []):
                    n = min(len(q), len(r.mask))
                    if any(r.mask[i] != "?" and r.mask[i] != q[i] for i in range(n)):
                        continue
                    if year and r.years and not (r.years[0] <= year <= r.years[1]):
                        continue
                    fixed = [i for i, ch in enumerate(r.mask) if ch != "?"]
                    seen = sum(1 for i in fixed if i < len(q))
                    complete = int(seen == len(fixed))
                    scored.append(((complete, seen, CONF_ORDER.get(r.confidence, 0), (r.years or (0, 0))[1]),
                                   r.slugs, r.model, r.confidence))
                scored.sort(key=lambda x: x[0], reverse=True)
                for key, slugs, model, conf in scored:
                    for sl in slugs:
                        items.append(self._item(self.cat.models[sl], "по началу VIN", conf != "probable"))
                    if not slugs and model:
                        bn = (w or {}).get("brand_names") or []
                        other.append(f"{bn[0]} {model}" if len(bn) == 1 else model)
                if not scored and w and w.get("brands"):
                    # правил по этой марке нет — предлагаем модели марки, самые новые выше
                    pool = [m for m in self.cat.models.values() if m.b in w["brands"]]
                    pool.sort(key=lambda m: -(m.yr or 0))
                    items = [self._item(m, "марка по коду " + q[:3], False) for m in pool]
                names = (w or {}).get("brand_names") or []
                out["message"] = (f"Код {q[:3]} — {', '.join(names) if 0 < len(names) <= 3 else (w or {}).get('maker') or (w or {}).get('make') or 'производитель'}"
                                  + (". Продолжайте вводить VIN — список сузится" if len(q) < 9 else ""))
            # начало номера кузова: «NZE14», «GD», «CW5»
            if any(ch.isdigit() for ch in q) and q[0].isalpha() and len(q) <= 8:
                codes = sorted(c for c in self.frame_rules if c.startswith(q))[:40]
                fr_items = []
                for c in codes:
                    for r in self.frame_rules[c]:
                        for sl in r.slugs:
                            fr_items.append(self._item(self.cat.models[sl], "кузов " + c, r.confidence != "probable"))
                        if not r.slugs and r.model:
                            other.append(r.model)
                if fr_items:
                    if out["kind"] == "none":
                        out.update(kind="frame_prefix", message="Номер кузова праворульного автомобиля — код до дефиса")
                    items = items + fr_items if out["kind"] == "vin_prefix" else fr_items
        if brand:
            items = [i for i in items if i["brand"] == brand]
        uniq, seen_s = [], set()
        for i in items:
            if i["slug"] not in seen_s:
                seen_s.add(i["slug"])
                uniq.append(i)
        out["items"], out["more"] = uniq[:limit], max(0, len(uniq) - limit)
        # «сошьём на заказ» — только модели, которых нет среди найденных лекал (Granta-хэтчбек не дублирует Granta-седан)
        titles = " | ".join(i["title"].lower() for i in uniq)
        core = lambda o: re.sub(r"\s*\(.*?\)", "", o).lower().split()
        out["other"] = [o for o in dict.fromkeys(o for o in other if o)
                        if not any(word in titles for word in core(o)[1:2] or core(o)[:1])][:4]
        return out

    # ---------- сверка с заказанным лекалом ----------
    def check(self, slug: str, raw: str, learned: Optional[List[dict]] = None) -> Tuple[str, dict]:
        """→ (состояние, расшифровка). ok — совпало, mismatch — по VIN другая машина, unknown — не определить, bad — не VIN."""
        d = self.decode(raw, learned)
        m = self.cat.models.get(slug)
        if d["kind"] == "invalid":
            return "bad", d
        if not m:
            return "unknown", d
        slugs = {x["slug"] for x in d["matches"]}
        if slugs:
            if slug in slugs:
                return "ok", d
            same_family = any(self.cat.models[s].f == m.f for s in slugs)
            return ("mismatch" if not same_family else "body"), d
        brands = (d.get("wmi") or {}).get("brands") or []
        if brands and m.b not in brands:
            return "mismatch", d
        if d["year"] and d.get("year_sure") and not self.cat.year_match(m, d["year"]):
            return "year", d
        return ("frame" if d["kind"] == "frame" else "unknown"), d


vin_base = VinBase()
