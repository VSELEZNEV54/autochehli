#!/usr/bin/env python3
# Использование: python3 tools/seat_cutout.py <сиденье_на_белом.png> <выход.png>
"""Вырезка сиденья с белого студийного фона: border-connected фон + матирование по известным F/B."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
h, w, _ = im.shape

# цвет фона — медиана по рамке 8px
border = np.concatenate([im[:8].reshape(-1, 3), im[-8:].reshape(-1, 3), im[:, :8].reshape(-1, 3), im[:, -8:].reshape(-1, 3)])
B = np.median(border, axis=0)

dist = np.linalg.norm(im - B, axis=2)
near_bg = dist < 70
lab, n = ndi.label(near_bg)
edge_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
edge_labels = edge_labels[edge_labels > 0]
region = np.isin(lab, edge_labels)          # фон + тень + светлая кайма
# под сиденьем между полозьями фон замкнут — в нижней части берём все светлые области
yy = np.arange(h)[:, None] * np.ones((1, w))
region |= near_bg & (yy > 0.74 * h)
# тень на полу: нейтральные светлее пластика — считаем тенью, а не сиденьем
lum = im.mean(axis=2)
sat = im.max(axis=2) - im.min(axis=2)
region |= (lum > 70) & (sat < 18) & (yy > 0.80 * h)

fg = ~region
core = ndi.binary_erosion(fg, iterations=2)

# ближайший пиксель ядра — оценка цвета переднего плана
d_core, (iy, ix) = ndi.distance_transform_edt(~core, return_indices=True)
F = im[iy, ix]
shadow = d_core > 4
F[shadow] = np.array([18, 18, 20], np.float32)

FB = F - B
den = np.maximum((FB ** 2).sum(axis=2), 1.0)
alpha = ((im - B) * FB).sum(axis=2) / den
alpha = np.clip(alpha, 0, 1)
alpha[core] = 1.0
alpha[alpha < 0.03] = 0
# тень делаем мягче и чуть слабее
alpha[shadow] *= 0.85

rgb = np.where(core[..., None], im, F)
out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)

ys, xs = np.where(alpha > 0.02)
pad = 12
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h)
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w)
Image.fromarray(out[y0:y1, x0:x1]).save(dst, optimize=True)
print(dst, (x1 - x0, y1 - y0), "bg", B.round(1))
