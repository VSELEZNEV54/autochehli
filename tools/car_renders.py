"""Рендеры кузовов: сырые PNG из Figma (generate_image) → assets/cars/*.png 1600×1000 на чистом белом фоне
+ js/cars.js (лекало → файл) для тех кузовов, у которых картинка уже есть.

Фон у генератора почти белый (252–254), поэтому поднимаем белую точку до 250 → #fff,
мягкая тень под машиной сохраняется. Машина масштабируется по ширине (поля по бокам SIDE),
низ (с тенью) ставится на одну линию — все кузова в карточках выглядят одинаково.

Список кузовов, промпты и лекала — tools/car_renders.json.

    python3 tools/car_renders.py <папка с <file>_raw.png> [--force]
"""
import glob
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "cars")
W, H = 1600, 1000      # 16:10, как .fam__media
SIDE, BOTTOM, TOP = 64, 56, 40
WHITE_POINT = 250      # всё светлее — чистый белый
THRESHOLD = 220        # что темнее — машина или её тень


def render(src, dst):
    im = Image.open(src).convert("RGB")
    im = im.point(lambda v: min(255, round(v * 255 / WHITE_POINT)))
    x0, y0, x1, y1 = im.convert("L").point(lambda v: 255 if v < THRESHOLD else 0).getbbox()
    m = 40
    crop = im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))
    ox, oy = x0 - max(0, x0 - m), y0 - max(0, y0 - m)
    s = min((W - 2 * SIDE) / (x1 - x0), (H - TOP - BOTTOM) / (y1 - y0))
    crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
    out = Image.new("RGB", (W, H), (255, 255, 255))
    left = (W - round((x1 - x0) * s)) // 2 - round(ox * s)
    top = H - BOTTOM - round((y1 - y0) * s) - round(oy * s)
    out.paste(crop, (left, top))
    out.save(dst, optimize=True)


def write_map():
    items = json.load(open(os.path.join(ROOT, "tools", "car_renders.json")))
    cars = {s: it["file"] for it in items if os.path.exists(os.path.join(OUT, it["file"] + ".png")) for s in it["slugs"]}
    with open(os.path.join(ROOT, "js", "cars.js"), "w") as f:
        f.write("/* Рендеры кузовов: лекало → assets/cars/<файл>.png. Собран tools/car_renders.py из tools/car_renders.json. */\n")
        f.write("window.AS_CARS = " + json.dumps(cars, ensure_ascii=False, sort_keys=True) + ";\n")
    return len(set(cars.values())), len(cars)


if __name__ == "__main__":
    src_dir = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else None
    if src_dir:
        for f in sorted(glob.glob(os.path.join(src_dir, "*_raw.png"))):
            name = os.path.basename(f)[: -len("_raw.png")]
            dst = os.path.join(OUT, name + ".png")
            if os.path.exists(dst) and "--force" not in sys.argv:
                continue
            render(f, dst)
            print(name)
    print("js/cars.js: %d кузовов, %d лекал" % write_map())
