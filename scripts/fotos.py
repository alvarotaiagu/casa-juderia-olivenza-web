"""Fotos de Casa de la Judería: verticales corregidas + gradación común.

Entrada: casa-juderia-olivenza-bocetos/ref/booking/<nn>-<id>.jpg (originales; no se tocan)
Salida:  scripts/fuentes/graduadas/b<nn>.jpg (máster, q 93)
         scripts/fuentes/hoja-antes-despues.jpg (para revisar a ojo)
Después: node scripts/fotos.mjs saca las versiones AVIF/WebP/JPG y completa data/fotos.json.

Solo fotos de Booking: las subió el propio alojamiento. Las de Google en alta
(puerta 03/06, fachada 08) no dicen quién las subió; ver README.

1 · VERTICALES (solo fotos verticales, como pide el encargo). El gran angular
    del móvil, apuntando hacia arriba, hace converger las paredes. Se buscan
    segmentos casi verticales (Canny + HoughLinesP), se estima su punto de fuga
    con un ajuste robusto (cada recta x = a + b·(y - H/2); si convergen en un
    punto, a = vx - b·(vy - H/2), que es una recta en el plano (b, a)) y se
    lleva ese punto al infinito con una homografía que deja fija la base y
    abre la parte de arriba. Se corrige el 85 % para que no quede «de maqueta»
    y nunca más de un tope: así el recorte que impone la homografía es mínimo
    (el rectángulo que queda dentro de la imagen corregida, nada más).
2 · GRADACIÓN (memoria «food photo consistency», sin desenfoque: son estancias
    y desenfocarlas mentiría sobre cómo son):
    parche blanco hacia la cal (paredes y sábanas), brillo medio común, curva en
    S suave, sombras hacia el marrón del logo, negro levantado hacia el «hondo»
    de la paleta y saturación contenida en lo muy vivo (cojines rojos, la J,
    el extintor).

  python scripts/fotos.py            (todas)
  python scripts/fotos.py b08 b12    (algunas, para probar)
"""
import json, math, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
ORIGEN = os.path.normpath(os.path.join(RAIZ, '..', 'casa-juderia-olivenza-bocetos', 'ref', 'booking'))
DESTINO = os.path.join(AQUI, 'fuentes', 'graduadas')
os.makedirs(DESTINO, exist_ok=True)

CAL = np.array([247, 246, 242]) / 255.0       # la cal, un pelo cálida
TINTA = np.array([72, 53, 38]) / 255.0        # marrón del logo
HONDO = np.array([39, 29, 22]) / 255.0

FUERZA_VERTICAL = 0.85
TOPE_INCLINACION = 0.22   # |b| máximo (dx/dy) que se acepta como «vertical torcida»


def archivo(n):
    pref = f'{int(n):02d}-'
    for f in os.listdir(ORIGEN):
        if f.startswith(pref) and f.endswith('.jpg'):
            return os.path.join(ORIGEN, f)
    raise FileNotFoundError(n)


# ───────────────────────────── 1 · verticales ─────────────────────────────
def segmentos_verticales(bgr):
    H, W = bgr.shape[:2]
    esc = 1200 / H
    peq = cv2.resize(bgr, (round(W * esc), 1200), interpolation=cv2.INTER_AREA)
    gris = cv2.cvtColor(peq, cv2.COLOR_BGR2GRAY)
    gris = cv2.GaussianBlur(gris, (3, 3), 0)
    bordes = cv2.Canny(gris, 40, 120)
    lineas = cv2.HoughLinesP(bordes, 1, np.pi / 720, threshold=60, minLineLength=110, maxLineGap=6)
    segs = []
    if lineas is None:
        return segs, esc
    for x1, y1, x2, y2 in np.asarray(lineas).reshape(-1, 4):
        dy = y2 - y1
        if abs(dy) < 1: continue
        b = (x2 - x1) / dy
        if abs(b) > TOPE_INCLINACION: continue
        ym = 600.0
        a = x1 + b * (ym - y1)               # x en y = H/2 (en la escala pequeña)
        L = math.hypot(x2 - x1, dy)
        segs.append((a / esc, b, L / esc))    # a en píxeles originales; b no cambia con la escala
    return segs, esc


def ajustar_fuga(segs, H):
    """Ajuste robusto de a = c0 + c1·b (RANSAC + mínimos cuadrados ponderados)."""
    if len(segs) < 6:
        return None
    A = np.array(segs)
    a, b, w = A[:, 0], A[:, 1], A[:, 2]
    mejor, mejor_in = None, None
    rng = np.random.default_rng(7)
    tol = 0.006 * H
    for _ in range(400):
        i, j = rng.choice(len(A), 2, replace=False)
        if abs(b[i] - b[j]) < 1e-3: continue
        c1 = (a[i] - a[j]) / (b[i] - b[j]); c0 = a[i] - c1 * b[i]
        # residuo: en px, a media altura; el ruido de b se multiplica por c1
        dentro = np.abs(a - (c0 + c1 * b)) < tol + np.abs(c1) * 0.004
        puntuacion = w[dentro].sum()
        if mejor is None or puntuacion > mejor:
            mejor, mejor_in = puntuacion, dentro
    if mejor_in is None or mejor_in.sum() < 5:
        return None
    X = np.c_[np.ones(mejor_in.sum()), b[mejor_in]]
    W_ = np.diag(w[mejor_in])
    c0, c1 = np.linalg.solve(X.T @ W_ @ X, X.T @ W_ @ a[mejor_in])
    return dict(c0=c0, c1=c1, n=int(mejor_in.sum()), peso=float(w[mejor_in].sum()), b_medio=float(np.average(b[mejor_in], weights=w[mejor_in])))


def corregir_verticales(rgb, nombre):
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    H, W = rgb.shape[:2]
    segs, _ = segmentos_verticales(bgr)
    fit = ajustar_fuga(segs, H)
    if not fit:
        print(f'  {nombre}: sin verticales fiables, sin corregir'); return rgb, None
    c0, c1 = fit['c0'], fit['c1']
    # punto de fuga: vx = c0, vy = H/2 - c1
    vx, vy = c0, H / 2 - c1
    if abs(vy - H / 2) < 0.8 * H:
        print(f'  {nombre}: fuga demasiado cerca ({round(vx)}, {round(vy)}), sin corregir'); return rgb, None
    # recta de cada borde: x(y) = a_borde + b_borde·(y - H/2); para las dos esquinas de abajo y las de arriba
    # Pendiente de una recta que pasa por el punto de fuga y por (x0, y0): b = (x0 - vx) / (y0 - vy)
    def b_por(x0, y0):
        return (x0 - vx) / (y0 - vy)
    # inclinación que se corregirá en cada borde (con la fuerza)
    if abs(vy) > 60 * H:   # prácticamente paralelas: solo giro
        giro = -math.degrees(math.atan(fit['b_medio'])) * FUERZA_VERTICAL
        if abs(giro) < 0.3:
            print(f'  {nombre}: rectas a plomo, sin corregir'); return rgb, None
        M = cv2.getRotationMatrix2D((W / 2, H / 2), giro, 1.0)
        out = cv2.warpAffine(rgb, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        rect = recorte_giro(W, H, giro)
        return recortar(out, rect), dict(tipo='giro', grados=round(giro, 2), n=fit['n'])
    # cuadrilátero de origen: las rectas hacia el punto de fuga que pasan por las esquinas del lado ancho
    arriba = vy < H / 2      # convergen hacia arriba (cámara mirando arriba): base fija
    yb = H if arriba else 0  # lado que se queda fijo
    yo = 0 if arriba else H  # lado que se abre
    bl, br = b_por(0, yb), b_por(W, yb)
    # con fuerza f: la pendiente corregida es (1-f)·b; el punto del lado opuesto en origen se mueve sobre la recta real
    # fuerza: 85 %, pero sin que el lado opuesto se ensanche más de 1,4 veces (si no, todo lo de
    # arriba queda achatado); lo que falte se queda como una leve convergencia natural
    xl_o = 0 + bl * (yo - yb); xr_o = W + br * (yo - yb)              # dónde está la recta de la esquina en el otro lado
    Wo = xr_o - xl_o
    f = FUERZA_VERTICAL
    if Wo < W:   # la apertura (ancho corregido / ancho real en el lado opuesto) no pasa de 1,4
        f = min(f, 1 - (W - 1.4 * Wo) / (W - Wo))
    xl_d = 0 + (1 - f) * bl * (yo - yb); xr_d = W + (1 - f) * br * (yo - yb)  # a dónde la llevamos
    src = np.float32([[0, yb], [W, yb], [xr_o, yo], [xl_o, yo]])
    dst = np.float32([[0, yb], [W, yb], [xr_d, yo], [xl_d, yo]])
    Hm = cv2.getPerspectiveTransform(src, dst)
    out = cv2.warpPerspective(rgb, Hm, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    # rectángulo útil: el mayor que queda dentro de la imagen original transformada
    esquinas = cv2.perspectiveTransform(np.float32([[[0, 0], [W, 0], [W, H], [0, H]]]), Hm)[0]
    rect = rect_interior(esquinas, W, H)
    # compensación de aspecto (como el «aspecto» de un upright): al abrir arriba, lo de arriba se
    # ensancha; se estira en vertical un 30 % de esa apertura para que no se vea achatado
    apertura = (xr_d - xl_d) / (xr_o - xl_o)
    k = 1 + 0.3 * (apertura - 1)
    rec = recortar(out, rect)
    if k > 1.005:
        rec = cv2.resize(rec, (rec.shape[1], round(rec.shape[0] * k)), interpolation=cv2.INTER_CUBIC)
    info = dict(tipo='homografia', fuga=[round(vx), round(vy)], n=fit['n'], fuerza=round(f, 2), aspecto=round(k, 3),
                inclinacion_bordes=[round(math.degrees(math.atan(bl)), 2), round(math.degrees(math.atan(br)), 2)],
                recorte=[int(v) for v in rect])
    return rec, info


def rect_interior(q, W, H):
    """q = esquinas transformadas [TL, TR, BR, BL]. Rectángulo eje-alineado dentro del cuadrilátero
    (convexo) y dentro del lienzo, conservando el ancho máximo posible."""
    TL, TR, BR, BL = q
    x0 = max(0, TL[0], BL[0]); x1 = min(W, TR[0], BR[0])
    y0 = max(0, TL[1], TR[1]); y1 = min(H, BL[1], BR[1])
    # los bordes laterales son rectas inclinadas: el x válido depende de y; tomar el más restrictivo en [y0, y1]
    def x_en(p, r, y):
        if abs(r[1] - p[1]) < 1e-6: return p[0]
        return p[0] + (r[0] - p[0]) * (y - p[1]) / (r[1] - p[1])
    for y in (y0, y1):
        x0 = max(x0, x_en(TL, BL, y)); x1 = min(x1, x_en(TR, BR, y))
    return (math.ceil(x0), math.ceil(y0), math.floor(x1), math.floor(y1))


def recorte_giro(W, H, grados):
    a = abs(math.radians(grados))
    # mayor rectángulo con la misma proporción dentro del rotado
    s = 1 / (math.cos(a) + max(W, H) / min(W, H) * math.sin(a))
    w, h = W * s, H * s
    return (round((W - w) / 2), round((H - h) / 2), round((W + w) / 2), round((H + h) / 2))


def recortar(img, rect):
    x0, y0, x1, y1 = rect
    return img[y0:y1, x0:x1]


# ───────────────────────────── 2 · gradación ─────────────────────────────
def a_lineal(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def a_srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def gradar(x):
    """x: float 0..1 RGB."""
    lin = a_lineal(x)
    lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    mx, mn = x.max(-1), x.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    # parche blanco
    p80, p995 = np.percentile(lum, 80), np.percentile(lum, 99.5)
    neutros = (lum > p80) & (lum < p995) & (sat < 0.20)
    cuota = neutros.mean()
    if cuota > 0.004:
        medio = lin[neutros].mean(0)
        objetivo = a_lineal(CAL) * (medio.mean() / a_lineal(CAL).mean())
        ganancia = objetivo / np.maximum(medio, 1e-4)
        fuerza = float(np.clip(cuota / 0.05, 0.25, 0.8))
        ganancia = np.clip(1 + (ganancia - 1) * fuerza, 0.85, 1.18)
        lin = lin * ganancia
    x = np.clip(a_srgb(np.clip(lin, 0, 1)), 0, 1)
    # brillo medio común (gamma sobre la mediana)
    L = 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]
    g = np.clip(np.log(0.55) / np.log(max(float(np.median(L)), 1e-3)), 0.85, 1.15)
    x = np.power(x, g)
    # curva en S suave
    L = 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]
    s = L + 0.085 * np.sin(np.pi * (L - 0.5)) * (1 - np.abs(2 * L - 1)) * 1.6
    x = x * (np.clip(s, 0, 1) / np.maximum(L, 1e-4))[..., None]
    # sombras hacia el marrón del logo (muy diluido)
    L = np.clip(0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2], 0, 1)
    sombra = np.clip(1 - L / 0.42, 0, 1) ** 1.5
    tinte = (TINTA / TINTA.mean() - 1) * 0.10
    x = x * (1 + sombra[..., None] * tinte)
    # negro levantado hacia el hondo
    x = HONDO * 0.5 + x * (1 - HONDO * 0.5)
    # saturación contenida, más en lo muy vivo
    L = (0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2])[..., None]
    mx, mn = x.max(-1, keepdims=True), x.min(-1, keepdims=True)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    factor = 0.9 - 0.18 * np.clip((sat - 0.45) / 0.4, 0, 1)
    x = L + (x - L) * factor
    return np.clip(x, 0, 1)


# ───────────────────────────── lista ─────────────────────────────
# (número de Booking, ¿corregir verticales?)
COMUNES = [2, 5, 6, 8, 9, 10, 11]
APTO_J = list(range(12, 28))
APTO_A = [1] + list(range(29, 42))
IGLESIAS = [42, 43, 44]
TODAS = COMUNES + APTO_J + APTO_A + IGLESIAS


def procesar(n):
    src = archivo(n)
    rgb = np.asarray(Image.open(src).convert('RGB'))
    H, W = rgb.shape[:2]
    info = None
    if H > W:   # solo las verticales
        rgb, info = corregir_verticales(rgb, f'b{n:02d}')
    x = gradar(rgb.astype(np.float64) / 255.0)
    out = Image.fromarray((x * 255 + 0.5).astype(np.uint8))
    out.save(os.path.join(DESTINO, f'b{n:02d}.jpg'), quality=93, subsampling=0)
    return dict(id=f'b{n:02d}', origen=os.path.basename(src), w=out.width, h=out.height, verticales=info)


def hoja(ids):
    """Antes (izquierda) y después (derecha), 260 px de alto cada par."""
    filas = []
    for i in ids:
        n = int(i[1:])
        a = Image.open(archivo(n)).convert('RGB'); b = Image.open(os.path.join(DESTINO, i + '.jpg'))
        h = 300
        a = a.resize((round(a.width * h / a.height), h)); b = b.resize((round(b.width * h / b.height), h))
        c = Image.new('RGB', (a.width + b.width + 30, h + 22), 'white')
        c.paste(a, (0, 22)); c.paste(b, (a.width + 30, 22))
        ImageDraw.Draw(c).text((4, 4), i, fill='black')
        filas.append(c)
    por_fila = 3
    anchos = [max(f.width for f in filas[k:k + por_fila]) for k in range(0, len(filas), por_fila)]
    W = max(sum(f.width + 20 for f in filas[k:k + por_fila]) for k in range(0, len(filas), por_fila))
    H = sum(max(f.height for f in filas[k:k + por_fila]) + 16 for k in range(0, len(filas), por_fila))
    hoja = Image.new('RGB', (W, H), (230, 230, 230))
    y = 0
    for k in range(0, len(filas), por_fila):
        x = 0
        for f in filas[k:k + por_fila]:
            hoja.paste(f, (x, y)); x += f.width + 20
        y += max(f.height for f in filas[k:k + por_fila]) + 16
    ruta = os.path.join(AQUI, 'fuentes', 'hoja-antes-despues.jpg')
    hoja.save(ruta, quality=85)
    return ruta


if __name__ == '__main__':
    pedidas = [int(a.lstrip('b')) for a in sys.argv[1:]] or TODAS
    informe = []
    for n in pedidas:
        r = procesar(n); informe.append(r)
        print(r['id'], r['w'], 'x', r['h'], r['verticales'] or '')
    ruta_inf = os.path.join(AQUI, 'fuentes', 'verticales.json')
    prev = {}
    if os.path.exists(ruta_inf):
        prev = {r['id']: r for r in json.load(open(ruta_inf, encoding='utf-8'))}
    for r in informe: prev[r['id']] = r
    json.dump(sorted(prev.values(), key=lambda r: r['id']), open(ruta_inf, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    verticales = [r['id'] for r in informe if r['verticales']]
    print('hoja:', hoja([r['id'] for r in informe if r['h'] > r['w'] or r['verticales']]))
