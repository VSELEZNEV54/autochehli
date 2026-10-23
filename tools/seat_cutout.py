#!/usr/bin/env python3
"""Вырезка объекта (сиденье, руль, коврики…) с белого студийного фона.

Фон = светлые области, связанные с краем кадра, + по флагам: замкнутые «дырки» фона
и тень на полу в нижней части кадра. Край матируется по известным цветам объекта и фона,
поэтому на тёмной подложке нет белой каймы.

Использование:
  python3 tools/seat_cutout.py <на_белом.png> <выход.png|.webp> [--near 0.74] [--floor 0.80] [--holes] [--max 1200]
  --near   ниже этой доли высоты все светлые области — фон (между полозьями сиденья); 0 — выключить
  --floor  ниже этой доли высоты нейтральные серые — тень на полу; 0 — выключить
  --floor-lum  с какой яркости серое считать тенью (70; для чёрных глянцевых объектов — 120)
  --shadow-blobs  убрать крупные светлые пятна тени между полозьями (растут до --shadow-lum), обивку не задевает
  --floor-free  тенью считать и серые пятна, замкнутые полозьями (нельзя для кресел со светло-серой экокожей)
  --shadow-lum  нижний порог яркости тени для --floor-free (например 55), чтобы под креслом не оставалось серых заплаток
  --floor2 / --floor2-from  своя линия тени для правой части кадра (с доли ширины), например для серого кресла справа
  --holes  убрать замкнутые светлые дырки фона (внутри руля, буквы «А», между ковриками)
  --max    ограничить большую сторону результата
  --bg-dist  насколько цвет может отличаться от фона, чтобы считаться фоном (70; для светло-серых объектов — 25–30)
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("dst")
ap.add_argument("--near", type=float, default=0.74)
ap.add_argument("--floor", type=float, default=0.80)
ap.add_argument("--floor-lum", type=float, default=70)
ap.add_argument("--floor-free", action="store_true")
ap.add_argument("--shadow-blobs", action="store_true")
ap.add_argument("--shadow-reach", type=int, default=14)
ap.add_argument("--shadow-lum", type=float, default=0)
ap.add_argument("--floor2", type=float, default=0)
ap.add_argument("--floor2-from", type=float, default=1.0)
ap.add_argument("--holes", action="store_true")
ap.add_argument("--max", type=int, default=0)
ap.add_argument("--bg-dist", type=float, default=70)
a = ap.parse_args()

im = np.asarray(Image.open(a.src).convert("RGB")).astype(np.float32)
h, w, _ = im.shape

# цвет фона — медиана по рамке 8px
border = np.concatenate([im[:8].reshape(-1, 3), im[-8:].reshape(-1, 3), im[:, :8].reshape(-1, 3), im[:, -8:].reshape(-1, 3)])
B = np.median(border, axis=0)

dist = np.linalg.norm(im - B, axis=2)
near_bg = dist < a.bg_dist
lab, n = ndi.label(near_bg)
edge_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
edge_labels = edge_labels[edge_labels > 0]
region = np.isin(lab, edge_labels)          # фон + тень + светлая кайма
yy = np.arange(h)[:, None] * np.ones((1, w))
lum = im.mean(axis=2)
sat = im.max(axis=2) - im.min(axis=2)
if a.near:
    # под сиденьем между полозьями фон замкнут — в нижней части берём все светлые области
    region |= near_bg & (yy > a.near * h)
# линия тени: можно задать свою для правой части кадра (--floor2 с доли ширины --floor2-from),
# например, когда справа кресло со светло-серой экокожей, а слева — тёмные
xx = np.ones((h, 1)) * np.arange(w)[None, :]
floor_line = np.where(xx >= a.floor2_from * w, a.floor2 or a.floor, a.floor) * h
if a.floor:
    # тень на полу: нейтральные светлее пластика — считаем тенью, а не объектом
    # берём только серые пятна, которые касаются фона: блики внутри объекта не трогаем
    cand = (lum > a.floor_lum) & (sat < 18) & (yy > floor_line)
    cl, cn = ndi.label(cand)
    touch = np.unique(cl[ndi.binary_dilation(region, iterations=2) & cand])
    region |= np.isin(cl, touch[touch > 0])
    if a.floor_free:
        # тень, замкнутая полозьями: берём все серые пятна ниже линии (только если светло-серой обивки нет).
        # --shadow-lum опускает порог, чтобы и тёмная часть тени стала полупрозрачной, а не серой заплаткой;
        # мелкие блики на полозьях (меньше 120 px) остаются непрозрачными
        sl = a.shadow_lum or a.floor_lum
        fl, fn = ndi.label((lum > sl) & (sat < 18) & (yy > floor_line))
        if fn:
            farea = ndi.sum(np.ones_like(lum), fl, np.arange(1, fn + 1))
            region |= np.isin(fl, np.arange(1, fn + 1)[farea > 120])
floor_reg = np.zeros((h, w), bool)
if a.shadow_blobs:
    # тень на полу между полозьями: крупные светло-серые пятна (средняя яркость > 150) ниже линии пола;
    # от них растим область по более тёмной полутени (до --shadow-lum), обивку и полозья не трогаем
    low = yy > floor_line
    # пятна считаем вместе с самой светлой серединой (её уже мог забрать --near), иначе средняя яркость занижена
    seeds_c = (lum > 110) & (sat < 18) & low
    sl_, sn_ = ndi.label(seeds_c)
    if sn_:
        ids = np.arange(1, sn_ + 1)
        big = ids[(ndi.sum(seeds_c, sl_, ids) > 2000) & (ndi.mean(lum, sl_, ids) > 150)]
        seeds = np.isin(sl_, big)
        # полутень растим только рядом с пятном, чтобы не забрать пластик и низ подушки
        grow_c = (lum > (a.shadow_lum or 60)) & (sat < 18) & low & ndi.binary_dilation(seeds, iterations=a.shadow_reach)
        gl_, gn_ = ndi.label(grow_c)
        hit = np.unique(gl_[seeds & grow_c])
        floor_reg = seeds | np.isin(gl_, hit[hit > 0])
        region |= floor_reg
if a.holes:
    # замкнутые дырки: почти белые нейтральные области заметной площади (ищем с мягким порогом 70,
    # чтобы в дырку попала и тень по её краю, даже если внешний фон режется строже)
    hl, hn = ndi.label(dist < 70)
    idx = np.arange(1, hn + 1)
    area = ndi.sum(np.ones_like(lum), hl, idx)
    mlum = ndi.mean(lum, hl, idx)
    msat = ndi.mean(sat, hl, idx)
    holes = idx[(area > 300) & (mlum > 226) & (msat < 12)]
    hmask = np.isin(hl, holes)
    # тень внутри дырки: светло-серые области, примыкающие к ней
    cl, cn = ndi.label((lum > 120) & (sat < 18) & ~hmask)
    touch = np.unique(cl[ndi.binary_dilation(hmask, iterations=2)])
    touch = touch[touch > 0]
    # серая кожа тоже касается дырки, но в целом она темнее тени — берём только светлые области
    if len(touch):
        touch = touch[ndi.mean(lum, cl, touch) > 185]
    region |= hmask | np.isin(cl, touch)

fg = ~region
core = ndi.binary_erosion(fg, iterations=2)

# ближайший пиксель ядра — оценка цвета переднего плана
d_core, (iy, ix) = ndi.distance_transform_edt(~core, return_indices=True)
F = im[iy, ix]
shadow = (d_core > 4) | floor_reg   # тень на полу всегда тёмная полупрозрачная, без цвета обивки по краю
F[shadow] = np.array([18, 18, 20], np.float32)

FB = F - B
den = np.maximum((FB ** 2).sum(axis=2), 1.0)
alpha = ((im - B) * FB).sum(axis=2) / den
alpha = np.clip(alpha, 0, 1)
alpha[core] = 1.0
alpha[alpha < 0.03] = 0
# тень делаем мягче и чуть слабее, еле заметную дымку по краям кадра убираем
alpha[shadow] *= 0.85
alpha[shadow & (alpha < 0.06)] = 0

rgb = np.where(core[..., None], im, F)
out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)

ys, xs = np.where(alpha > 0.15)
pad = 12
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h)
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w)
res = Image.fromarray(out[y0:y1, x0:x1])
if a.max and max(res.size) > a.max:
    k = a.max / max(res.size)
    res = res.resize((round(res.width * k), round(res.height * k)), Image.LANCZOS)
if a.dst.lower().endswith(".webp"):
    res.save(a.dst, quality=84, method=6)
else:
    res.save(a.dst, optimize=True)
print(a.dst, res.size, "bg", B.round(1))
