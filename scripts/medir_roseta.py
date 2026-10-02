"""Mide la roseta del logo (JPG 1599x1096) para redibujarla con geometría.
Salida por consola: centro, radios del anillo, radio de los pétalos, dientes
(número, ángulos, radios interior/exterior) y orientación de los pétalos."""
import numpy as np, math, json, sys
from PIL import Image
from scipy import ndimage

im = np.asarray(Image.open('scripts/fuentes/logo-casa-juderia.jpg').convert('L')).astype(float)
dark = im < 128
lab, n = ndimage.label(dark)

def medir(x0, x1, y0, y1, nombre):
    sub = lab[y0:y1, x0:x1]
    ids, cnt = np.unique(sub[sub > 0], return_counts=True)
    anillo = ids[np.argmax(cnt)]
    m = lab == anillo
    ys, xs = np.nonzero(m)
    # centro: ajuste de círculo al borde exterior del anillo (puntos del contorno)
    er = m & ~ndimage.binary_erosion(m)
    ey, ex = np.nonzero(er)
    cx0, cy0 = xs.mean(), ys.mean()
    d = np.hypot(ex - cx0, ey - cy0)
    ext = d > np.percentile(d, 55)          # borde exterior
    A = np.c_[2 * ex[ext], 2 * ey[ext], np.ones(ext.sum())]
    b = ex[ext] ** 2 + ey[ext] ** 2
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    R_ext = math.sqrt(c + cx * cx + cy * cy)
    # perfil radial del anillo: fracción oscura por radio, sobre todos los ángulos
    yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
    rr = np.hypot(xx - cx, yy - cy)
    th = (np.degrees(np.arctan2(yy - cy, xx - cx)) + 360) % 360
    prof = []
    for r in np.arange(0, 110, 1.0):
        sel = (rr >= r) & (rr < r + 1)
        prof.append(dark[sel].mean())
    prof = np.array(prof)
    # dientes
    dientes = []
    for i in np.unique(lab[(rr > R_ext + 2) & (rr < R_ext + 45)]):
        if i == 0 or i == anillo: continue
        mm = lab == i
        if mm.sum() < 60: continue
        y_, x_ = np.nonzero(mm)
        r_ = np.hypot(x_ - cx, y_ - cy); t_ = np.degrees(np.arctan2(y_ - cy, x_ - cx))
        tc = math.degrees(math.atan2((y_ - cy).mean(), (x_ - cx).mean()))
        dientes.append(dict(px=int(mm.sum()), ang=round((tc + 360) % 360, 1),
                            rmin=round(float(np.percentile(r_, 2)), 1), rmax=round(float(np.percentile(r_, 98)), 1)))
    dientes.sort(key=lambda d: d['ang'])
    return dict(nombre=nombre, cx=round(cx, 2), cy=round(cy, 2), R_ext=round(R_ext, 2), perfil=prof, dientes=dientes, th=th, rr=rr)

for caja, nombre in [((530, 760, 130, 360), 'izq'), ((860, 1080, 130, 360), 'der')]:
    r = medir(*caja, nombre)
    print('==', nombre, 'centro', r['cx'], r['cy'], 'R_ext anillo', r['R_ext'])
    p = r['perfil']
    print('perfil oscuro por radio (cada 2 px):', ' '.join(f'{int(v*100):02d}' for v in p[::2]))
    print('dientes', len(r['dientes']))
    for d in r['dientes']: print('  ', d)
    # angulos de las puntas de los pétalos: en un radio intermedio, buscar claros (pétalos)
    for rad in (0.35, 0.55, 0.75):
        R = r['R_ext'] * rad
        angs = np.arange(0, 360, 1.0)
        v = [im[int(round(r['cy'] + R * math.sin(math.radians(a)))), int(round(r['cx'] + R * math.cos(math.radians(a))))] for a in angs]
        v = np.array(v) < 128
        print(f'  r={rad:.2f}R  oscuro por grado:', ''.join('#' if x else '.' for x in v[::3]))
