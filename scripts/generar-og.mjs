/* og:image hecha a propósito (1200 × 630): a la izquierda, el símbolo de la
   chimenea y el rótulo sobre el papel; a la derecha, la fachada (b06) con el
   friso de dientes en su borde. Se compone en HTML y se fotografía con Playwright.

   node scripts/generar-og.mjs   → assets/og-casa-juderia.jpg
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = f => fs.readFileSync(path.join(raiz, 'assets/logo', f), 'utf8').replace(/<\?xml[^>]*>\s*/, '');
const foto = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(raiz, 'assets/fotos/b06-1080.jpg')).toString('base64');
const W = 1200, H = 630;
const dientes = Array.from({ length: 27 }, (_, i) => `<path d="M0 ${i * 24 + 2.4}L11.2 ${i * 24 + 12}L0 ${i * 24 + 21.6}Z"/>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@600&display=swap" rel="stylesheet">
<style>
  body{margin:0;width:${W}px;height:${H}px;background:#ECEAE3;position:relative;overflow:hidden;font-family:Commissioner,sans-serif}
  .simbolo{position:absolute;left:150px;top:62px;width:370px}
  .rotulo{position:absolute;left:96px;top:376px;width:480px}
  .simbolo svg,.rotulo svg{width:100%;height:auto;display:block}
  .lugar{position:absolute;left:0;width:672px;top:548px;text-align:center;font:600 18px/1 Commissioner;letter-spacing:.24em;text-transform:uppercase;color:#895D32}
  .foto{position:absolute;left:672px;top:0;width:${W - 672}px;height:${H}px;background:url('${foto}') 34% 46%/cover}
  .friso{position:absolute;left:672px;top:0;height:${H}px;fill:#B5773A}
</style></head><body>
<div class="simbolo">${svg('simbolo.svg')}</div>
<div class="rotulo">${svg('rotulo.svg')}</div>
<p class="lugar">Calle Santiago 7A · Olivenza</p>
<div class="foto"></div>
<svg class="friso" width="12" height="${H}" viewBox="0 0 12 ${H}">${dientes}</svg>
</body></html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: W, height: H } });
await pagina.setContent(html, { waitUntil: 'networkidle' });
await pagina.screenshot({ path: path.join(raiz, 'assets/og-casa-juderia.jpg'), type: 'jpeg', quality: 88 });
await navegador.close();
console.log('assets/og-casa-juderia.jpg');
