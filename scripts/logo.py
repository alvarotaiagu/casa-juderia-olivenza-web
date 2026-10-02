"""Logo de Casa de la Judería, redibujado desde el JPG de Booking (1599 x 1096).

No hay vector del logo: se rehace así (medidas en píxeles del JPG; ver
scripts/medir_roseta.py, que las saca):

  · LA ROSETA, con geometría de compás, no con potrace. Un círculo C de radio
    r = 53,5 y seis arcos del mismo radio centrados sobre C dejan los seis
    pétalos; otros seis arcos de radio r, centrados a r·√3, cierran las lentes
    claras que quedan entre las puntas (en el JPG, el claro empieza a 0,73·r:
    √3 - 1 = 0,732). Alrededor, el anillo (de 53,5 a 68,5) y la corona de
    14 dientes triangulares con la punta hacia dentro (de 76 a 96; base del
    80 % del paso). La roseta izquierda del logo y las de la chimenea (foto 08)
    tienen 14; la derecha del logo, dibujada a mano, 16: se toman 14.
    Pétalos en horizontal (0°, 60°…), como la roseta izquierda de la chimenea.
  · LA CRUZ Y LA PEANA, con medidas: palo de 11 de ancho, travesaño de 12 a
    y = 128, mesa de 207 x 5, peana de 81 de alto con los costados cóncavos
    (136 arriba, 110 en la cintura, 137 abajo), medallón claro de radio 24 y
    base de 168 x 6. La «estrellita» del medallón son seis brazos finos en
    forma de pétalo (como la roseta en pequeño), uno hacia arriba: así la
    dibuja el logo y así está en la peana de la chimenea.
  · EL RÓTULO «Casa de la Judería / de Olivenza», con potrace, componente a
    componente (cada letra y la tilde son un <path> propio, en orden de
    lectura), para poder animarlas por separado.

Salida:
  assets/logo/roseta.svg     una roseta (viewBox -100 -100 200 200)
  assets/logo/simbolo.svg    cruz + peana + dos rosetas (viewBox 0 0 540 424)
  assets/logo/rotulo.svg     el rótulo
  assets/logo/logo.svg       todo junto, con el marco del original
  assets/favicon.svg         la roseta sobre crema
  scripts/fuentes/comprobacion-simbolo.png   el redibujo (rojo) sobre el JPG
y escribe entre marcas en los HTML:
  <!-- sprite:inicio --> … <!-- sprite:fin -->            símbolos para <use>
  <!-- simbolo-hero:inicio --> … <!-- simbolo-hero:fin -->  símbolo animable

  python scripts/logo.py
"""
import math, os, re
import numpy as np
import potrace
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
JPG = os.path.join(AQUI, 'fuentes', 'logo-casa-juderia.jpg')
TINTA = '#483526'
CREMA = '#F3F1EA'

# ─────────────────────────── medidas (px del JPG) ───────────────────────────
R = 53.5                 # círculo del compás = borde interior del anillo
ANILLO = (53.5, 68.5)
DIENTES = 14
DIENTE_R = (76.0, 96.0)  # punta (dentro) y base (fuera)
DIENTE_BASE = 0.80       # fracción del paso angular que ocupa la base
OFFSET = (530.0, 52.0)   # del JPG al viewBox del símbolo
CENTROS = [(637.0, 241.3), (963.5, 241.3)]   # y = media de las dos medidas (242,2 y 240,3)
EJE = 800.0              # eje de la cruz (punto medio de las rosetas: 800,25)

f = lambda v: (f'{v:.2f}').rstrip('0').rstrip('.') if abs(v) > 1e-9 else '0'


def pt(a, rad=R):
    return (rad * math.cos(math.radians(a)), rad * math.sin(math.radians(a)))


def arco(p_ini, p_fin, centro, rad):
    """Comando A de SVG del arco corto de p_ini a p_fin con ese centro."""
    a0 = math.atan2(p_ini[1] - centro[1], p_ini[0] - centro[0])
    a1 = math.atan2(p_fin[1] - centro[1], p_fin[0] - centro[0])
    d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
    barrido = 1 if d > 0 else 0          # y hacia abajo: ángulo positivo = sentido horario
    return f'A{f(rad)} {f(rad)} 0 0 {barrido} {f(p_fin[0])} {f(p_fin[1])}'


def muestrear_arco(p_ini, p_fin, centro, rad, n=24):
    a0 = math.atan2(p_ini[1] - centro[1], p_ini[0] - centro[0])
    a1 = math.atan2(p_fin[1] - centro[1], p_fin[0] - centro[0])
    d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
    return [(centro[0] + rad * math.cos(a0 + d * i / n), centro[1] + rad * math.sin(a0 + d * i / n)) for i in range(n + 1)]


# ─────────────────────────── roseta (centrada en 0,0) ───────────────────────────
P = [pt(60 * k) for k in range(6)]                  # puntas de los pétalos sobre C
Q = [(P[k][0] + P[(k + 1) % 6][0], P[k][1] + P[(k + 1) % 6][1]) for k in range(6)]   # centros de las lentes (a r·√3)
O = (0.0, 0.0)


HUECO_ESCALA = 0.82   # tallado: el triángulo oscuro deja un filo claro alrededor (como en el JPG y la chimenea)


def _hueco_bruto(k):
    a, b = P[k], P[(k + 1) % 6]
    return (muestrear_arco(O, a, P[(k - 1) % 6], R) + muestrear_arco(a, b, Q[k], R)[1:] + muestrear_arco(b, O, P[(k + 2) % 6], R)[1:])


def _centro(k):
    pts = np.array(_hueco_bruto(k)); return pts.mean(0)


def hueco(k):
    """Triángulo curvo oscuro entre el pétalo k y el k+1: O → Pk → Pk+1 → O, encogido hacia su centro.
    Escalar un arco circular da otro arco circular: basta escalar puntos y radios."""
    c = _centro(k); s = HUECO_ESCALA
    E = lambda p: (c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s)
    a, b = P[k], P[(k + 1) % 6]
    o, a2, b2 = E(O), E(a), E(b)
    return (f'M{f(o[0])} {f(o[1])}' + arco(o, a2, E(P[(k - 1) % 6]), R * s) + arco(a2, b2, E(Q[k]), R * s)
            + arco(b2, o, E(P[(k + 2) % 6]), R * s) + 'Z')


def hueco_poligono(k):
    c = _centro(k); s = HUECO_ESCALA
    return [(c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s) for x, y in _hueco_bruto(k)]


def diente(i):
    paso = 360 / DIENTES
    c = i * paso
    m = paso * DIENTE_BASE / 2
    punta = pt(c, DIENTE_R[0]); iz = pt(c - m, DIENTE_R[1]); de = pt(c + m, DIENTE_R[1])
    return f'M{f(punta[0])} {f(punta[1])}L{f(iz[0])} {f(iz[1])}' + arco(iz, de, O, DIENTE_R[1]) + 'Z'


def diente_poligono(i):
    paso = 360 / DIENTES; c = i * paso; m = paso * DIENTE_BASE / 2
    return [pt(c, DIENTE_R[0])] + muestrear_arco(pt(c - m, DIENTE_R[1]), pt(c + m, DIENTE_R[1]), O, DIENTE_R[1], 8)


ANILLO_D = (f'M{f(ANILLO[1])} 0A{f(ANILLO[1])} {f(ANILLO[1])} 0 1 1 {f(-ANILLO[1])} 0A{f(ANILLO[1])} {f(ANILLO[1])} 0 1 1 {f(ANILLO[1])} 0Z'
            f'M{f(ANILLO[0])} 0A{f(ANILLO[0])} {f(ANILLO[0])} 0 1 0 {f(-ANILLO[0])} 0A{f(ANILLO[0])} {f(ANILLO[0])} 0 1 0 {f(ANILLO[0])} 0Z')
HUECOS_D = ''.join(hueco(k) for k in range(6))
DIENTES_D = [diente(i) for i in range(DIENTES)]

# trazos de construcción (para la cortina): el círculo, los seis arcos de pétalo y los seis de lente
CIRCULO_D = f'M{f(R)} 0A{f(R)} {f(R)} 0 1 1 {f(-R)} 0A{f(R)} {f(R)} 0 1 1 {f(R)} 0'
ARCOS_PETALO = []
for k in range(6):          # arco centrado en Pk, de P(k-1) a P(k+1) pasando por O (120°)
    a, b = P[(k - 1) % 6], P[(k + 1) % 6]
    ARCOS_PETALO.append(f'M{f(a[0])} {f(a[1])}' + arco(a, O, P[k], R) + arco(O, b, P[k], R))
ARCOS_LENTE = []
for k in range(6):
    a, b = P[k], P[(k + 1) % 6]
    ARCOS_LENTE.append(f'M{f(a[0])} {f(a[1])}' + arco(a, b, Q[k], R))


def roseta_svg(clase='roseta', trazos=False, sangria=''):
    s = sangria
    out = [f'{s}<g class="roseta__dientes">']
    out += [f'{s}  <path class="roseta__diente" d="{d}"/>' for d in DIENTES_D]
    out += [f'{s}</g>',
            f'{s}<path class="roseta__anillo" d="{ANILLO_D}" fill-rule="evenodd"/>',
            f'{s}<path class="roseta__huecos" d="{HUECOS_D}"/>']
    if trazos:
        out += [f'{s}<g class="roseta__traza" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">',
                f'{s}  <path class="traza__circulo" d="{CIRCULO_D}" pathLength="1"/>']
        out += [f'{s}  <path class="traza__petalo" d="{d}" pathLength="1"/>' for d in ARCOS_PETALO]
        out += [f'{s}  <path class="traza__lente" d="{d}" pathLength="1"/>' for d in ARCOS_LENTE]
        out += [f'{s}</g>']
    return '\n'.join(out)


# ─────────────────────────── cruz y peana (coordenadas del símbolo) ───────────────────────────
X = lambda x: x - OFFSET[0]
Y = lambda y: y - OFFSET[1]
EJE_S = X(EJE)                          # 270
PALO = dict(x=EJE_S - 5.5, y=Y(60), w=11, h=Y(358) - Y(60))
TRAVESANO = dict(x=EJE_S - 62, y=Y(122), w=124, h=12)
MESA = dict(x=EJE_S - 103.5, y=Y(357), w=207, h=5)
PEANA_Y = (Y(371), Y(452))
PEANA = dict(arriba=68, cintura=55, abajo=68.5)
MEDALLON = dict(cx=EJE_S, cy=Y(409.3), r=24)
BASE = dict(x=EJE_S - 84, y=Y(461), w=168, h=6)
FLOR_R = 17.5          # largo de cada brazo de la estrellita


def peana_d():
    y0, y1 = PEANA_Y; ym = (y0 + y1) / 2
    a, c, b = PEANA['arriba'], PEANA['cintura'], PEANA['abajo']
    ctrl = 2 * c - (a + b) / 2          # cuadrática: x(0,5) = cintura
    cx, cy, r = MEDALLON['cx'], MEDALLON['cy'], MEDALLON['r']
    contorno = (f'M{f(EJE_S - a)} {f(y0)}H{f(EJE_S + a)}Q{f(EJE_S + ctrl)} {f(ym)} {f(EJE_S + b)} {f(y1)}'
                f'H{f(EJE_S - b)}Q{f(EJE_S - ctrl)} {f(ym)} {f(EJE_S - a)} {f(y0)}Z')
    agujero = f'M{f(cx + r)} {f(cy)}A{f(r)} {f(r)} 0 1 0 {f(cx - r)} {f(cy)}A{f(r)} {f(r)} 0 1 0 {f(cx + r)} {f(cy)}Z'
    return contorno + agujero


def flor_d():
    """Seis brazos en forma de pétalo (lente de ancho 0,32 del largo), uno hacia arriba."""
    cx, cy = MEDALLON['cx'], MEDALLON['cy']
    d = []
    for k in range(6):
        ang = math.radians(-90 + 60 * k)
        ux, uy = math.cos(ang), math.sin(ang); nx, ny = -uy, ux
        tip = (cx + ux * FLOR_R, cy + uy * FLOR_R)
        w = FLOR_R * 0.32
        c1 = (cx + ux * FLOR_R / 2 + nx * w, cy + uy * FLOR_R / 2 + ny * w)
        c2 = (cx + ux * FLOR_R / 2 - nx * w, cy + uy * FLOR_R / 2 - ny * w)
        d.append(f'M{f(cx)} {f(cy)}Q{f(c1[0])} {f(c1[1])} {f(tip[0])} {f(tip[1])}Q{f(c2[0])} {f(c2[1])} {f(cx)} {f(cy)}Z')
    return ''.join(d)


def rect(r, clase):
    return f'<rect class="{clase}" x="{f(r["x"])}" y="{f(r["y"])}" width="{f(r["w"])}" height="{f(r["h"])}"/>'


ROS = [(X(cx), Y(cy)) for cx, cy in CENTROS]


def simbolo_svg(animable=False, sangria=''):
    s = sangria
    out = []
    if animable:
        # la cruz sube desde detrás de la mesa: recorte por encima de la mesa
        out += [f'{s}<defs><clipPath id="corte-cruz"><rect x="0" y="0" width="540" height="{f(MESA["y"] + 1)}"/></clipPath></defs>']
    out += [f'{s}<g class="simbolo__cruz"' + (' clip-path="url(#corte-cruz)"' if animable else '') + '>',
            f'{s}  <g class="cruz">',
            f'{s}    ' + rect(PALO, 'cruz__palo'),
            f'{s}    ' + rect(TRAVESANO, 'cruz__travesano'),
            f'{s}  </g>',
            f'{s}</g>',
            f'{s}<g class="simbolo__peana">',
            f'{s}  ' + rect(MESA, 'peana__mesa'),
            f'{s}  <path class="peana__cuerpo" d="{peana_d()}" fill-rule="evenodd"/>',
            f'{s}  <path class="peana__flor" d="{flor_d()}"/>',
            f'{s}  ' + rect(BASE, 'peana__base'),
            f'{s}</g>']
    for i, (cx, cy) in enumerate(ROS):
        lado = 'izq' if i == 0 else 'der'
        out += [f'{s}<g class="simbolo__roseta simbolo__roseta--{lado}" transform="translate({f(cx)} {f(cy)})">',
                f'{s}  <g class="roseta">',
                roseta_svg(trazos=animable and i == 0, sangria=s + '    '),
                f'{s}  </g>',
                f'{s}</g>']
    return '\n'.join(out)


# ─────────────────────────── comprobación sobre el JPG ───────────────────────────
def comprobar():
    base = Image.open(JPG).convert('RGB')
    capa = Image.new('RGBA', base.size, (0, 0, 0, 0))
    dib = ImageDraw.Draw(capa)
    rojo = (220, 30, 40, 120)
    def poly_roseta(cx, cy):
        T = lambda p: (p[0] + cx, p[1] + cy)
        for i in range(DIENTES): dib.polygon([T(p) for p in diente_poligono(i)], fill=rojo)
        for k in range(6): dib.polygon([T(p) for p in hueco_poligono(k)], fill=rojo)
        for rr in np.arange(ANILLO[0], ANILLO[1], 0.5):
            dib.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=rojo, width=1)
    for cx, cy in CENTROS: poly_roseta(cx, cy)
    g = lambda r: [r['x'] + OFFSET[0], r['y'] + OFFSET[1], r['x'] + r['w'] + OFFSET[0], r['y'] + r['h'] + OFFSET[1]]
    for r in (PALO, TRAVESANO, MESA, BASE): dib.rectangle(g(r), fill=rojo)
    y0, y1 = PEANA_Y[0] + OFFSET[1], PEANA_Y[1] + OFFSET[1]
    ex = EJE
    lados = []
    for t in np.linspace(0, 1, 30):
        y = y0 + (y1 - y0) * t
        a, c, b = PEANA['arriba'], PEANA['cintura'], PEANA['abajo']; ctrl = 2 * c - (a + b) / 2
        w = (1 - t) ** 2 * a + 2 * (1 - t) * t * ctrl + t * t * b
        lados.append((ex + w, y))
    dib.polygon(lados + [(2 * ex - x, y) for x, y in reversed(lados)], fill=rojo)
    m = MEDALLON
    dib.ellipse([m['cx'] + OFFSET[0] - m['r'], m['cy'] + OFFSET[1] - m['r'], m['cx'] + OFFSET[0] + m['r'], m['cy'] + OFFSET[1] + m['r']], fill=(40, 120, 220, 110))
    out = Image.alpha_composite(base.convert('RGBA'), capa).convert('RGB').crop((500, 40, 1100, 480))
    out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS)
    out.save(os.path.join(AQUI, 'fuentes', 'comprobacion-simbolo.png'))
    # medida objetiva: coincidencia de máscaras (IoU) en la zona del símbolo
    oscuro = np.asarray(Image.open(JPG).convert('L')) < 128
    rojo_m = np.asarray(capa)[..., 3] > 0
    zona = np.zeros_like(oscuro); zona[50:480, 520:1080] = True
    inter = (oscuro & rojo_m & zona).sum(); union = ((oscuro | rojo_m) & zona).sum()
    print(f'IoU símbolo redibujado / JPG: {inter / union:.3f}')


# ─────────────────────────── rótulo con potrace ───────────────────────────
ROTULO_CAJA = (88, 556, 1500, 966)        # x0, y0, x1, y1 en el JPG


def a_d(curvas, k, dx, dy):
    g = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
    d = []
    for cv in curvas:
        s = cv.start_point
        d.append(f'M{g(s.x * k + dx)} {g(s.y * k + dy)}')
        for sg in cv:
            if sg.is_corner:
                d.append(f'L{g(sg.c.x * k + dx)} {g(sg.c.y * k + dy)}L{g(sg.end_point.x * k + dx)} {g(sg.end_point.y * k + dy)}')
            else:
                d.append(f'C{g(sg.c1.x * k + dx)} {g(sg.c1.y * k + dy)} {g(sg.c2.x * k + dx)} {g(sg.c2.y * k + dy)} {g(sg.end_point.x * k + dx)} {g(sg.end_point.y * k + dy)}')
        d.append('Z')
    return ''.join(d)


def rotulo():
    x0, y0, x1, y1 = ROTULO_CAJA
    L = np.asarray(Image.open(JPG).convert('L').crop(ROTULO_CAJA)).astype(float)
    oscuro = L < 128
    lab, n = ndimage.label(oscuro, structure=np.ones((3, 3)))
    cajas = ndimage.find_objects(lab)
    tam = ndimage.sum(oscuro, lab, range(1, n + 1))
    comps = []
    for i, (sl, t) in enumerate(zip(cajas, tam)):
        if t < 120: continue
        cy = (sl[0].start + sl[0].stop) / 2
        comps.append(dict(i=i + 1, sl=sl, linea=0 if cy < 240 else 1, x=sl[1].start, y=sl[0].start, t=int(t)))
    # la tilde de «í» es su propia componente (encima de la línea 1)
    comps.sort(key=lambda c: (c['linea'], c['x']))
    UP = 3
    letras = []
    for c in comps:
        sl = c['sl']
        m = 6
        ya, yb = max(0, sl[0].start - m), min(L.shape[0], sl[0].stop + m)
        xa, xb = max(0, sl[1].start - m), min(L.shape[1], sl[1].stop + m)
        sub = L[ya:yb, xa:xb].copy()
        solo = lab[ya:yb, xa:xb] == c['i']
        # solo esta componente: lo demás, a fondo (con un margen para el antialias de su borde)
        cerca = ndimage.binary_dilation(solo, iterations=2)
        sub[~cerca] = 255
        img = Image.fromarray(sub.clip(0, 255).astype(np.uint8)).resize(((xb - xa) * UP, (yb - ya) * UP), Image.LANCZOS)
        img = img.filter(ImageFilter.GaussianBlur(1.0))
        tinta = np.asarray(img) < 128
        curvas = list(potrace.Bitmap(~tinta).trace(turdsize=10, alphamax=1.0, opticurve=True, opttolerance=0.6))
        # potracer traza lo que vale False: se le pasa el fondo (~tinta). Una letra de un solo
        # contorno da una sola curva; eso es correcto, no hay que «darle la vuelta».
        hy, hx = tinta.shape
        def es_marco(cv):
            xs = [cv.start_point.x] + [sg.end_point.x for sg in cv]; ys = [cv.start_point.y] + [sg.end_point.y for sg in cv]
            return min(xs) < 1 and min(ys) < 1 and max(xs) > hx - 1 and max(ys) > hy - 1
        assert not any(es_marco(cv) for cv in curvas), 'potrace ha trazado el fondo'
        d = a_d(curvas, 1 / UP, xa, ya)
        letras.append(dict(d=d, linea=c['linea'], x=c['x'], t=c['t']))
    W, H = x1 - x0, y1 - y0
    print('rótulo:', len(letras), 'componentes;', sum(len(l['d']) for l in letras), 'caracteres de path')
    return letras, W, H


def rotulo_svg(letras, W, H, sangria='', clase='rotulo'):
    s = sangria
    out = [f'{s}<g class="{clase}__linea {clase}__linea--1">']
    out += [f'{s}  <path class="{clase}__letra" d="{l["d"]}"/>' for l in letras if l['linea'] == 0]
    out += [f'{s}</g>', f'{s}<g class="{clase}__linea {clase}__linea--2">']
    out += [f'{s}  <path class="{clase}__letra" d="{l["d"]}"/>' for l in letras if l['linea'] == 1]
    out += [f'{s}</g>']
    return '\n'.join(out)


# ─────────────────────────── escribir ───────────────────────────
def escribir(ruta, texto):
    ruta = os.path.join(RAIZ, ruta)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, 'w', encoding='utf-8', newline='\n') as fh: fh.write(texto)


def inyectar(pagina, marca, contenido):
    ruta = os.path.join(RAIZ, pagina)
    if not os.path.exists(ruta): return False
    html = open(ruta, encoding='utf-8').read()
    ini, fin = f'<!-- {marca}:inicio -->', f'<!-- {marca}:fin -->'
    if ini not in html: return False
    a = html.index(ini) + len(ini); b = html.index(fin)
    sangria = re.search(r'([ \t]*)<!-- ' + re.escape(marca) + ':inicio', html).group(1)
    nuevo = html[:a] + '\n' + contenido + '\n' + sangria + html[b:]
    if len(nuevo) < len(html) * 0.5: raise SystemExit('Me niego: ' + pagina + ' perdería demasiado')
    if nuevo != html:
        with open(ruta, 'w', encoding='utf-8', newline='\n') as fh: fh.write(nuevo)
    return True


if __name__ == '__main__':
    comprobar()
    letras, RW, RH = rotulo()
    cab = '<?xml version="1.0" encoding="UTF-8"?>\n'
    escribir('assets/logo/roseta.svg', cab + f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" fill="{TINTA}">\n<title>Roseta hexapétala de la chimenea</title>\n' + roseta_svg() + '\n</svg>\n')
    escribir('assets/logo/simbolo.svg', cab + f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 424" fill="{TINTA}">\n<title>Cruz del Calvario entre dos rosetas</title>\n' + simbolo_svg() + '\n</svg>\n')
    escribir('assets/logo/rotulo.svg', cab + f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {RW} {RH}" fill="{TINTA}">\n<title>Casa de la Judería de Olivenza</title>\n' + rotulo_svg(letras, RW, RH) + '\n</svg>\n')
    # logo completo con el marco del original (marco de 1599 x 1096: filete grueso a ~22 px del borde)
    marco = f'<path d="M22 22H1577V1074H22Z M36 36V1060H1563V36Z" fill-rule="evenodd"/>'
    logo = (cab + f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1599 1096" fill="{TINTA}">\n<title>Casa de la Judería de Olivenza</title>\n'
            f'<rect width="1599" height="1096" fill="#FFFFFF"/>\n{marco}\n'
            f'<g transform="translate({f(OFFSET[0])} {f(OFFSET[1])})">\n' + simbolo_svg(sangria='  ') + '\n</g>\n'
            f'<g transform="translate({ROTULO_CAJA[0]} {ROTULO_CAJA[1]})">\n' + rotulo_svg(letras, RW, RH, sangria='  ') + '\n</g>\n</svg>\n')
    escribir('assets/logo/logo.svg', logo)
    escribir('assets/favicon.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-104 -104 208 208">\n<circle r="104" fill="{CREMA}"/>\n<g fill="{TINTA}">\n' + roseta_svg() + '\n</g>\n</svg>\n')

    sprite = '\n'.join([
        '<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute">',
        '  <symbol id="s-roseta" viewBox="-100 -100 200 200">',
        roseta_svg(sangria='    '),
        '  </symbol>',
        '  <symbol id="s-simbolo" viewBox="0 0 540 424">',
        simbolo_svg(sangria='    '),
        '  </symbol>',
        f'  <symbol id="s-rotulo" viewBox="0 0 {RW} {RH}">',
        rotulo_svg(letras, RW, RH, sangria='    '),
        '  </symbol>',
        '</svg>'])
    for pagina in ('index.html', '404.html', 'aviso-legal.html', 'privacidad.html'):
        ok = inyectar(pagina, 'sprite', sprite)
        print(('sprite en ' if ok else 'sin marca sprite: ') + pagina)
    heroe = simbolo_svg(animable=True, sangria='          ')
    print('símbolo animable en index.html' if inyectar('index.html', 'simbolo-hero', heroe) else 'sin marca simbolo-hero')
    rot = rotulo_svg(letras, RW, RH, sangria='          ')
    print('rótulo en index.html' if inyectar('index.html', 'rotulo-hero', rot) else 'sin marca rotulo-hero')
    with open(os.path.join(AQUI, 'fuentes', 'rotulo-medidas.txt'), 'w', encoding='utf-8') as fh:
        fh.write(f'viewBox 0 0 {RW} {RH}\n')
