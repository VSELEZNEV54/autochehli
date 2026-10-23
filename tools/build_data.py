#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собирает js/data.js из «каталог/Каталог Автостиль — разбор.xlsx», лист «Каталог».
Марка → модель (семейство) → поколение → вариант лекала, годы, цены сайта (жаккард / экокожа / алькантара).
Старая (зачёркнутая) цена комплекта «o» — из tools/old_prices.json, собрана со страниц моделей 1avtochehol.ru (22.10.2026).
Запуск: python3 tools/build_data.py"""
import zipfile, re, json, pathlib, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
XLSX = ROOT / "каталог" / "Каталог Автостиль — разбор.xlsx"
OLD = json.loads((ROOT / "tools" / "old_prices.json").read_text(encoding="utf-8"))
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def read_sheet(name):
    z = zipfile.ZipFile(XLSX)
    shared = []
    ss = [n for n in z.namelist() if n.lower().endswith("sharedstrings.xml")]
    if ss:
        for si in ET.fromstring(z.read(ss[0])).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    rid = next(s.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id") for s in wb.find("m:sheets", NS) if s.get("name") == name)
    t = rels[rid].lstrip("/"); t = t if t.startswith("xl/") else "xl/" + t
    def col(ref):
        n = 0
        for ch in re.match(r"[A-Z]+", ref).group(0): n = n * 26 + ord(ch) - 64
        return n - 1
    out = []
    for row in ET.fromstring(z.read(t)).find("m:sheetData", NS):
        vals = {}
        for c in row:
            v = c.find("m:v", NS); tt = c.get("t")
            if tt == "s" and v is not None: val = shared[int(v.text)]
            elif tt == "inlineStr": val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
            elif v is not None: val = v.text
            else: continue
            vals[col(c.get("r"))] = val.strip()
        out.append(vals)
    return out

BRANDS = {  # имя в каталоге: (id, логотип, синонимы)
 "Audi": ("audi", "audi.jpg", "ауди"), "BMW": ("bmw", "bmw.jpg", "бмв бэха"), "Chery": ("chery", "cherry.jpg", "чери черри"),
 "Chevrolet": ("chevrolet", "chevrolet.jpg", "шевроле шеви"), "Citroen": ("citroen", "citroen.jpg", "ситроен"), "Daewoo": ("daewoo", "daewoo.jpg", "дэу деу"),
 "Daihatsu": ("daihatsu", "daihatsu.jpg", "дайхатсу"), "Datsun": ("datsun", "datsun.jpg", "датсун"), "Dodge": ("dodge", "dodge.jpg", "додж"),
 "Fiat": ("fiat", "fiat.jpg", "фиат"), "Ford": ("ford", "ford.jpg", "форд"), "ГАЗ": ("gaz", "gaz.jpg", "газ газель gaz"),
 "Great Wall": ("great-wall", "greatwall.jpg", "грейт волл"), "Haval": ("haval", "haval.png", "хавейл хавал"), "Honda": ("honda", "honda.jpg", "хонда"),
 "Hyundai": ("hyundai", "hyundai.jpg", "хендай хундай хёндай хюндай хендэ"), "Isuzu": ("isuzu", "isuzu.jpg", "исузу"), "Kia": ("kia", "kia.png", "киа"),
 "Lada": ("lada", "lada.jpg", "лада ваз автоваз"), "Land Rover": ("land-rover", "landrover.jpg", "ленд ровер лендровер"), "Lexus": ("lexus", "lexus.jpg", "лексус"),
 "Lifan": ("lifan", "lifan.jpg", "лифан"), "Mazda": ("mazda", "mazda.jpg", "мазда"), "Mercedes": ("mercedes", "mercedes.jpg", "мерседес мерс бенц"),
 "Mitsubishi": ("mitsubishi", "mitsubishi.jpg", "митсубиси мицубиси"), "Nissan": ("nissan", "nissan.jpg", "ниссан"), "Opel": ("opel", "opel.jpg", "опель"),
 "Peugeot": ("peugeot", "peugeot.jpg", "пежо"), "Pontiac": ("pontiac", "pontiac.jpg", "понтиак"), "Renault": ("renault", "renault.jpg", "рено"),
 "Skoda": ("skoda", "skoda.jpg", "шкода"), "Smart": ("smart", "smart.jpg", "смарт"), "SsangYong": ("ssangyong", "ssang.jpg", "санг йонг ссангйонг"),
 "Subaru": ("subaru", "subaru.jpg", "субару"), "Suzuki": ("suzuki", "suzuki.jpg", "сузуки"), "TagAZ": ("tagaz", "tagaz.jpg", "тагаз"),
 "Toyota": ("toyota", "toyota.jpg", "тойота тайота"), "УАЗ": ("uaz", "uaz.jpg", "уаз uaz"), "Volkswagen": ("volkswagen", "volkswagen.jpg", "фольксваген вв vw"),
 "Volvo": ("volvo", "volvo.jpg", "вольво"), "ZAZ": ("zaz", "zaz.jpg", "заз"),
}
SYN = {"camry":"камри","corolla":"королла","rav":"рав4 рав","land cruiser":"ленд крузер крузак","prado":"прадо","highlander":"хайлендер","hilux":"хайлюкс",
 "solaris":"солярис","creta":"крета","tucson":"туссан туксон","santa":"санта фе","elantra":"элантра","accent":"акцент","getz":"гетц","ix35":"икс35",
 "rio":"рио","sportage":"спортейдж","ceed":"сид","cerato":"церато","optima":"оптима","sorento":"соренто","picanto":"пиканто","soul":"соул","seltos":"селтос",
 "duster":"дастер","logan":"логан","sandero":"сандеро","kaptur":"каптюр","arkana":"аркана","megane":"меган","fluence":"флюенс",
 "largus":"ларгус","vesta":"веста","granta":"гранта","priora":"приора","kalina":"калина","niva":"нива","xray":"иксрей","4x4":"нива 4х4",
 "qashqai":"кашкай","x-trail":"икстрейл х-трейл","almera":"альмера","juke":"жук","terrano":"террано","note":"ноут","tiida":"тиида","murano":"мурано",
 "octavia":"октавия","rapid":"рапид","fabia":"фабия","kodiaq":"кодиак","superb":"суперб","yeti":"йети","polo":"поло","tiguan":"тигуан","passat":"пассат",
 "jetta":"джетта","golf":"гольф","touareg":"туарег","caddy":"кадди","outlander":"аутлендер","lancer":"лансер","asx":"асх","pajero":"паджеро","l200":"л200",
 "cx-5":"сх5 сх-5","civic":"цивик","accord":"аккорд","cr-v":"срв цр-в","focus":"фокус","kuga":"куга","mondeo":"мондео","fiesta":"фиеста",
 "astra":"астра","corsa":"корса","zafira":"зафира","vectra":"вектра","patriot":"патриот","hunter":"хантер","gazel":"газель","газель":"газель","forester":"форестер",
 "outback":"аутбек","impreza":"импреза","vitara":"витара","sx4":"сх4","swift":"свифт","jimny":"джимни","actyon":"актион","kyron":"кайрон",
 "jolion":"джолион","tiggo":"тигго","cruze":"круз","lacetti":"лачетти","aveo":"авео","captiva":"каптива","cobalt":"кобальт","nexia":"нексия","matiz":"матиз"}

def slugify(s):
    tr = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", ["a","b","v","g","d","e","e","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","h","c","ch","sh","sch","","y","","e","yu","ya"]))
    s = "".join(tr.get(ch, ch) for ch in s.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def num(x):
    try: return int(float(x))
    except Exception: return None

rows = read_sheet("Каталог")
head = rows[0]; idx = {v: k for k, v in head.items()}
def g(r, name): return r.get(idx[name], "")
models = []
for r in rows[1:]:
    url = g(r, "Страница на сайте")
    if not url.startswith("http"): continue
    brand = g(r, "Марка")
    if brand not in BRANDS: print("нет марки:", brand); continue
    bid = BRANDS[brand][0]
    slug = url.rstrip("/").split("/")[-1].lower()
    slug = re.sub(r"^cherry_", "chery_", slug); slug = re.sub(r"^deawoo_", "daewoo_", slug)
    fam = g(r, "Модель"); gen = g(r, "Поколение / кузов"); var = g(r, "Вариант лекала (чем отличается)")
    years = g(r, "Годы выпуска (с сайта)")
    gen = "" if gen in ("—", "-") else gen
    years = "" if years in ("—", "-") else years
    prices = [num(g(r, "Цена на сайте: жаккард, ₽")), num(g(r, "Цена на сайте: экокожа, ₽")), num(g(r, "Цена на сайте: алькантара, ₽"))]
    prices = [p or d for p, d in zip(prices, (7975, 9375, 9975))]
    low = (fam + " " + gen).lower()
    syn = " ".join(v for k, v in SYN.items() if k in low)
    ru = g(r, "Русское название (PROP41)")
    models.append({"s": slug, "b": bid, "f": bid + "-" + slugify(fam), "m": fam, "g": gen, "v": var, "y": years,
                   "yr": num(g(r, "Год начала выпуска")) or 0, "p": prices, "o": OLD.get(slug, 0), "ru": (ru + " " + syn).strip()})

used = {m["b"] for m in models}
brands = [{"id": v[0], "n": k, "logo": v[1], "s": v[2]} for k, v in BRANDS.items() if v[0] in used]
js = "/* Каталог «Автостиль»: марка → модель → поколение → вариант лекала. Собран tools/build_data.py из «Каталог Автостиль — разбор.xlsx». */\n"
js += "window.AS_BRANDS = " + json.dumps(brands, ensure_ascii=False) + ";\n"
js += "window.AS_MODELS = " + json.dumps(models, ensure_ascii=False, separators=(",", ":")) + ";\n"
(ROOT / "js" / "data.js").write_text(js, encoding="utf-8")
fams = {m["f"] for m in models}
print(f"марок {len(brands)}, моделей {len(fams)}, лекал {len(models)}")
