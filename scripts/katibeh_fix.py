"""Copia de Katibeh solo latín con métricas verticales iguales en todas las plataformas
(la original: hhea 490/-510+200 frente a win 1000/200 -> la línea base cae 0,41 em más abajo en Windows que en Mac/iOS).
Ascendente/descendente elegidos para que la altura de mayúscula quede centrada en la caja de contenido.

Katibeh (OFL 1.1, sin nombre reservado: se puede modificar) es la Google Font libre más cercana
al rótulo del logo. Entrada: scripts/fuentes/Katibeh-Regular.ttf (github google/fonts, ofl/katibeh).
Salida: assets/fuentes/katibeh-latin.woff (la licencia va al lado, OFL-Katibeh.txt).

  python scripts/katibeh_fix.py"""
import os
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(AQUI, 'fuentes', 'Katibeh-Regular.ttf')
OUT = os.path.join(AQUI, '..', 'assets', 'fuentes', 'katibeh-latin.woff')
f = TTFont(SRC)
opts = subset.Options()
opts.layout_features = ['*']
opts.name_IDs = ['*']
opts.notdef_outline = True
opts.flavor = None
uni = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x131, 0x152, 0x153, 0x2C6, 0x2DA, 0x2DC, 0x2013, 0x2014,
       0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2039, 0x203A, 0x20AC, 0x2122]
sub = subset.Subsetter(opts)
sub.populate(unicodes=uni)
sub.subset(f)

gs = f.getGlyphSet()
ymax, ymin = 0, 0
for g in f.getGlyphOrder():
    p = BoundsPen(gs); gs[g].draw(p)
    if p.bounds:
        ymin = min(ymin, p.bounds[1]); ymax = max(ymax, p.bounds[3])
cap = 467
A, D = 767, 300            # A - D = cap -> mayúscula centrada
hh, os2 = f['hhea'], f['OS/2']
hh.ascent, hh.descent, hh.lineGap = A, -D, 0
os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = A, -D, 0
os2.usWinAscent, os2.usWinDescent = max(A, int(ymax)), max(D, int(-ymin))
os2.version = max(os2.version, 4)
os2.fsSelection |= 1 << 7  # USE_TYPO_METRICS
os2.sxHeight, os2.sCapHeight = 332, 467
print('yMax/yMin latín', ymax, ymin, '-> win', os2.usWinAscent, os2.usWinDescent)
f.flavor = 'woff'
f.save(OUT)
print(OUT, os.path.getsize(OUT), 'bytes')
cm = f.getBestCmap()
print('faltan:', [c for c in 'áéíóúñÑüÜ«»¿¡€·0123456789' if ord(c) not in cm])
