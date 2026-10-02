/* Versiones responsive de las fotos graduadas: AVIF + WebP + JPG.
   Lee los másteres de scripts/fuentes/graduadas/ (los saca scripts/fotos.py) y escribe:

     assets/fotos/<id>-<ancho>.avif|webp|jpg
     data/fotos.json  ← le añade w, h y anchos a cada foto (conserva alt y grupo)

   Anchos por defecto 480, 960 y 1440 (sin pasar del original); una foto puede
   pedir otros con "anchos_pedidos" (la del hero llega a 2200).

   node scripts/fotos.mjs
   Usa sharp del node_modules de alvarotaiagu.github.io (no hay npm en este repo).
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/package.json');
const sharp = require('sharp');

const origen = path.join(raiz, 'scripts', 'fuentes', 'graduadas');
const destino = path.join(raiz, 'assets', 'fotos');
fs.mkdirSync(destino, { recursive: true });
const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'fotos.json'), 'utf8'));

let bytes = 0;
const solo = process.argv.slice(2);
for (const f of datos.fotos) {
  if (solo.length && !solo.includes(f.id)) continue;
  /* un recorte («de» + «recorte» [x0, y0, x1, y1] sobre el máster graduado) sale como foto propia */
  const src = path.join(origen, (f.de || f.id) + '.jpg');
  const abrir = () => f.recorte
    ? sharp(src).extract({ left: f.recorte[0], top: f.recorte[1], width: f.recorte[2] - f.recorte[0], height: f.recorte[3] - f.recorte[1] })
    : sharp(src);
  const meta = f.recorte ? { width: f.recorte[2] - f.recorte[0], height: f.recorte[3] - f.recorte[1] } : await sharp(src).metadata();
  f.w = meta.width; f.h = meta.height;
  const pedidos = f.anchos_pedidos || [480, 960, 1440];
  const anchos = pedidos.filter(a => a < meta.width - 40);
  if (!anchos.length || meta.width - anchos[anchos.length - 1] > 120) anchos.push(Math.min(meta.width, pedidos[pedidos.length - 1]));
  f.anchos = [...new Set(anchos)].sort((a, b) => a - b);
  for (const a of f.anchos) {
    const base = abrir().resize({ width: a, withoutEnlargement: true });
    const salidas = [
      [base.clone().avif({ quality: 50, effort: 5 }), 'avif'],
      [base.clone().webp({ quality: 72 }), 'webp'],
      [base.clone().jpeg({ quality: 76, mozjpeg: true, progressive: true }), 'jpg']
    ];
    for (const [s, ext] of salidas) {
      const out = path.join(destino, `${f.id}-${a}.${ext}`);
      await s.toFile(out);
      bytes += fs.statSync(out).size;
    }
  }
}
/* quitar versiones viejas que ya no salen de la lista (solo en la pasada completa) */
const validos = new Set(datos.fotos.flatMap(f => f.anchos.flatMap(a => ['avif', 'webp', 'jpg'].map(e => `${f.id}-${a}.${e}`))));
if (!solo.length) for (const n of fs.readdirSync(destino)) if (!validos.has(n)) fs.rmSync(path.join(destino, n));
fs.writeFileSync(path.join(raiz, 'data', 'fotos.json'), JSON.stringify(datos, null, 1) + '\n');
console.log(datos.fotos.length, 'fotos ·', (bytes / 1048576).toFixed(1), 'MB en assets/fotos');
