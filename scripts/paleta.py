"""Paleta de Casa de la Judería: tokens medidos y alternativas derivadas.

Medido (2026-10-02):
  · marrón del logo (núcleo del trazo, L<80 en el JPG de Booking): #483526
  · fondo del logo: #FDFDFD (es blanco, no crema) → el papel se toma del
    mármol de la jamba de la 7A (#E4D2C2, en sombra) llevado a claro y enfriado
  · cal de la pared en sombra: #E5E4E1 → tarjetas casi blancas
  · madera de la puerta 7A (foto 09): mediana #884815, zona iluminada #B36B29
    → miel (solo decorativo)
Las alternativas giran el matiz de la marca en OKLCH conservando L y C.

python scripts/paleta.py   (imprime tokens, alternativas y contrastes)
"""
import math

def hex2rgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
def rgb2hex(c): return '#' + ''.join('%02X' % max(0, min(255, round(v * 255))) for v in c)
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def delin(c): return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
def lum(h): r, g, b = (lin(v) for v in hex2rgb(h)); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def contraste(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + 0.05) / (lb + 0.05)

def to_oklch(h):
    r, g, b = (lin(v) for v in hex2rgb(h))
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l, m, s = (math.copysign(abs(v) ** (1/3), v) for v in (l, m, s))
    L = 0.2104542553*l + 0.7936177850*m - 0.0040720468*s
    a = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s
    bb = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360

def from_oklch(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774*a + 0.2158037573*b) ** 3
    m = (L - 0.1055613458*a - 0.0638541728*b) ** 3
    s = (L - 0.0894841775*a - 1.2914855480*b) ** 3
    r = 4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    bl = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    return rgb2hex([delin(max(0, min(1, v))) for v in (r, g, bl)])

T = dict(
    papel='#ECEAE3',   # crema fría: mármol de la jamba aclarado y enfriado (matiz 94°)
    cal='#F7F6F2',     # tarjetas
    tinta='#483526',   # marrón del logo (fijo en las tres paletas)
    marca='#483526',   # el que gira con el mando
    hondo='#221C18',   # secciones oscuras
    miel='#B5773A',    # madera de la 7A, solo decorativo
    crema='#F3F1EA',   # texto sobre oscuro
)
for k, v in T.items(): print(f'{k:6} {v}  oklch', tuple(round(x, 3) for x in to_oklch(v)))
print()
def apagado(fg, bg, a):  # componer alfa
    F, B = hex2rgb(fg), hex2rgb(bg); return rgb2hex([f * a + b * (1 - a) for f, b in zip(F, B)])
pares = [('tinta', 'papel'), ('tinta', 'cal'), ('crema', 'hondo'), ('miel', 'papel'), ('miel', 'hondo'), ('marca', 'papel'), ('crema', 'marca')]
for f, b in pares: print(f'{f:6} sobre {b:6} {contraste(T[f], T[b]):5.2f}')
for a in (.62, .68, .72, .76):
    print('apagado tinta', a, apagado(T['tinta'], T['papel'], a), round(contraste(apagado(T['tinta'], T['papel'], a), T['papel']), 2),
          '| crema sobre hondo', apagado(T['crema'], T['hondo'], a), round(contraste(apagado(T['crema'], T['hondo'], a), T['hondo']), 2))
# acento-texto: miel mezclado con tinta hasta AA sobre papel
for p in (0.75, 0.65, 0.6, 0.55, 0.5):
    m = apagado(T['miel'], T['tinta'], p); print('miel', p, '+tinta', m, round(contraste(m, T['papel']), 2), round(contraste(m, T['cal']), 2))
# miel claro para texto sobre hondo
for p in (0.6, 0.5, 0.4):
    m = apagado(T['miel'], T['crema'], p); print('miel', p, '+crema', m, round(contraste(m, T['hondo']), 2))
print('\nalternativas (giro de matiz de marca y hondo, L y C iguales):')
for nombre, h in (('azul', 262), ('oliva', 112)):
    out = {}
    for k in ('marca', 'hondo'):
        L, C, H = to_oklch(T[k]); out[k] = from_oklch(L, C * 1.15, h)
    print(nombre, out, 'crema/hondo', round(contraste(T['crema'], out['hondo']), 2), 'crema/marca', round(contraste(T['crema'], out['marca']), 2), 'marca/papel', round(contraste(out['marca'], T['papel']), 2), 'miel/hondo', round(contraste(T['miel'], out['hondo']), 2))
print('\nCasa María: papel #F6F0EA', tuple(round(x, 3) for x in to_oklch('#F6F0EA')), 'cacao #825A50', tuple(round(x, 3) for x in to_oklch('#825A50')))
