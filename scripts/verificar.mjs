/* Verificación de Casa de la Judería · «Roseta».
   Una comprobación por cada punto del checklist de web desde cero, del PLIEGO §5
   y de las reglas de contenido del encargo. Arranca su propio servidor.

   node scripts/verificar.mjs              → comprobaciones
   node scripts/verificar.mjs --capturas   → además, capturas en screenshots/
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/package.json');
const sharp = require('sharp');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURAS = process.argv.includes('--capturas');
const dirCapturas = path.join(raiz, 'screenshots');
if (CAPTURAS) fs.mkdirSync(dirCapturas, { recursive: true });
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');

let total = 0, fallos = 0;
const ok = (nombre, cond, detalle = '') => {
  total++;
  if (!cond) fallos++;
  console.log((cond ? '  ok   ' : '  FALLO ') + nombre + (detalle ? '  · ' + detalle : ''));
};
const seccion = t => console.log('\n── ' + t);

/* ───────────── servidor propio ───────────── */
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.json': 'application/json' };
function servir(dir, puerto) {
  return new Promise(res => {
    const s = http.createServer((req, r) => {
      const limpia = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(dir, limpia === '/' ? 'index.html' : limpia);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        r.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); r.end(fs.readFileSync(path.join(dir, '404.html'))); return;
      }
      r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      r.end(fs.readFileSync(f));
    }).listen(puerto, '127.0.0.1', () => res(s));
  });
}
const PUERTO = 4198;
const URL = `http://127.0.0.1:${PUERTO}/`;
const servidor = await servir(raiz, PUERTO);
const navegador = await chromium.launch();

async function abrir({ ancho = 1440, alto = 900, reducido = false, sinGsap = false, extra = '', cookiesVistas = false, estado = null, init = null } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, reducedMotion: reducido ? 'reduce' : 'no-preference', storageState: estado || undefined });
  if (init) await ctx.addInitScript(init);
  if (sinGsap) await ctx.route(/cdn\.jsdelivr\.net\/npm\/(gsap|lenis)/, r => r.abort());
  if (cookiesVistas) await ctx.addInitScript(() => { try { localStorage.setItem('cdlj-cookies', '1'); } catch (e) {} });
  const pg = await ctx.newPage();
  const errores = [];
  pg.on('console', m => { if (m.type() === 'error' && !(sinGsap && /jsdelivr|ERR_FAILED/.test(m.text()))) errores.push(m.text()); });
  pg.on('pageerror', e => errores.push('pageerror ' + e.message));
  pg.on('response', r => { if (r.status() >= 400) errores.push(r.status() + ' ' + r.url()); });
  pg.on('requestfailed', r => { if (!(sinGsap && /jsdelivr/.test(r.url()))) errores.push('fallo ' + r.url() + ' ' + (r.failure() || {}).errorText); });
  await pg.goto(URL + extra, { waitUntil: 'load' });
  return { ctx, pg, errores };
}
async function recorrer(pg, paso = 520) {
  await pg.mouse.move(Math.round((pg.viewportSize().width) / 2), 400);
  let ant = -1;
  for (let i = 0; i < 160; i++) {
    await pg.mouse.wheel(0, paso);
    await pg.waitForTimeout(110);
    const y = await pg.evaluate(() => Math.round(window.scrollY));
    if (y === ant) break;
    ant = y;
  }
  await pg.waitForTimeout(2600);
}
async function irA(pg, selector) {
  await pg.evaluate(s => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80); }, selector);
  await pg.waitForTimeout(400);
}
async function captura(pg, nombre, opciones = {}) {
  if (!CAPTURAS) return;
  await pg.screenshot({ path: path.join(dirCapturas, nombre + '.png'), ...opciones });
}
const esperarCortinaFuera = pg => pg.waitForFunction(() => getComputedStyle(document.getElementById('cortina')).display === 'none', null, { timeout: 8000 }).then(() => true, () => false);

/* ═════════════════════ 1 · archivos ═════════════════════ */
seccion('Archivos y cabeceras (PLIEGO §5)');
const paginas = ['index.html', '404.html', 'aviso-legal.html', 'privacidad.html'];
for (const p of paginas) {
  const html = leer(p);
  ok(`${p}: <meta charset> primero y noindex detrás`, /<head>\s*<meta charset="utf-8">\s*<meta name="robots" content="noindex, nofollow">/.test(html));
}
for (const f of ['404.html', '.nojekyll', 'manifest.json', 'assets/favicon.svg', 'assets/og-casa-juderia.jpg', 'assets/logo/logo.svg', 'assets/logo/simbolo.svg', 'assets/logo/rotulo.svg', 'assets/logo/roseta.svg', 'README.md'])
  ok('existe ' + f, fs.existsSync(path.join(raiz, f)));
const og = await sharp(path.join(raiz, 'assets/og-casa-juderia.jpg')).metadata();
ok('og:image de 1200×630', og.width === 1200 && og.height === 630, og.width + '×' + og.height);
ok('manifest.json válido', (() => { try { return !!JSON.parse(leer('manifest.json')).icons.length; } catch (e) { return false; } })());
const indice = leer('index.html');
ok('Lenis desde jsDelivr (cdnjs da 404)', /cdn\.jsdelivr\.net\/npm\/lenis@/.test(indice) && !/cdnjs[^"]*lenis/.test(indice));
ok('sin aggregateRating ni review en JSON-LD', !/aggregateRating|"review"/.test(indice));
ok('el mapa no está en el HTML (solo bajo clic)', !/<iframe/i.test(indice));
ok('CSS y JS propios versionados (?v=)', /css\/estilos\.css\?v=[0-9a-f]{8}"/.test(indice) && /js\/main\.js\?v=[0-9a-f]{8}"/.test(indice));
for (const p of ['index.html', '404.html']) {
  const usos = [...leer(p).matchAll(/<use[^>]*#s-roseta[^>]*>/g)].map(m => m[0]);
  ok(`${p}: cada <use> de la roseta lleva x/y/width/height (viewBox centrado: si no, se desplaza)`, usos.length > 0 && usos.every(u => /\sx="-?[\d.]+"/.test(u) && /\swidth="/.test(u)), usos.length + ' usos');
}
ok('aviso de cookies con :not([hidden])', /\.cookies:not\(\[hidden\]\)\s*\{\s*display:\s*flex/.test(leer('css/estilos.css')) && !/\.cookies\s*\{[^}]*display:\s*flex/.test(leer('css/estilos.css')));

/* ═════════════════════ 2 · contenido ═════════════════════ */
seccion('Reglas de contenido');
const textoVisible = html => html
  .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(?:img|svg|use)[^>]*>/g, m => ' ' + ((m.match(/\salt="([^"]*)"/) || [])[1] || '') + ' ' + ((m.match(/\saria-label="([^"]*)"/) || [])[1] || '') + ' ')
  .replace(/<meta[^>]*content="([^"]*)"[^>]*>/g, ' $1 ¦ ')
  .replace(/<\/(p|li|div|h\d|section|figcaption|dd|dt|td|th|blockquote|footer|header|span|a|button|caption)>/g, ' ¦ ')
  .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const textos = Object.fromEntries(paginas.map(p => [p, textoVisible(leer(p))]));
const todo = Object.values(textos).join(' \n ');
const prohibido = (nombre, re) => { const m = todo.match(re); ok(nombre, !m, m ? '«' + m[0] + '»' : ''); };
prohibido('nunca «casa rural» ni «turismo rural»', /casa rural|turismo rural/i);
prohibido('nada de «en plena/la judería»', /en (plena|la) judería/i);
prohibido('nada de «casa judía/medieval»', /casa (judía|medieval)/i);
prohibido('nada de expulsión en 1492', /expuls\w+ .{0,30}1492/i);
prohibido('sin símbolos ✡ 🕎 ni letras hebreas', /[✡🕎\u0590-\u05FF]/u);
prohibido('sin menorá ni estrella de David', /menor[áa]\b|estrella de david/i);
prohibido('sin recuento de reseñas (cifra)', /\b\d+\s+(reseñas|comentarios|opiniones|valoraciones)\b/i);
prohibido('sin recuento de reseñas (palabra)', /\b(una|un|dos|tres|cuatro|cinco|seis|veinte\w*)\s+(reseñas?|comentarios?|opiniones?)\b/i);
prohibido('sin ordinales ni «única» reseña', /(primer[ao]?|segund[ao]|únic[ao]|sola)\s+(reseña|comentario|opinión)/i);
prohibido('sin precios', /€|\beuros?\b|por noche|\/noche|\bprecios?\b|\btarifas?\b/i);
prohibido('sin superlativo del Árbol de Jesé', /más grande (del|de los que se conocen en el) mundo|único en el mundo/i);
prohibido('sin «de los mejores de España» del museo', /de los mejores de España|una de las mejores colecciones/i);
prohibido('sin soberanía («portuguesa», «en disputa», «doble nacionalidad»)', /portuguesa|en disputa|doble nacionalidad/i);
prohibido('tono: sin «experiencia única», «rincón con encanto», «escapada perfecta»', /experiencia única|rincón con encanto|escapada perfecta/i);
prohibido('sin WhatsApp (no confirmado)', /whatsapp|wa\.me/i);
prohibido('sin email inventado', /[a-z0-9._-]+@[a-z0-9-]+\.[a-z]{2,}/i);
prohibido('Javier, solo el nombre de pila', /Javier\s+[A-ZÁÉÍÓÚ][a-záéíóú]+/);
const rincones = [...todo.matchAll(/mejor rincón/gi)];
ok('«El Mejor Rincón de España 2012» siempre con su fuente (Guía Repsol)', rincones.every(m => /Guía Repsol/.test(todo.slice(m.index, m.index + 160))), rincones.length + ' mención(es)');
const FRASE = 'La casa toma su nombre del barrio judío medieval de Olivenza, cuya calle de la sinagoga, la antigua rua da Esnoga, está a dos minutos a pie.';
const sinagogas = [...todo.matchAll(/sinagoga/gi)];
ok('«sinagoga» solo dentro de la frase del nombre', sinagogas.length >= 1 && sinagogas.every(m => todo.slice(Math.max(0, m.index - 120), m.index + 120).includes(FRASE)), sinagogas.length + ' vez/veces');
ok('la frase del nombre, tal cual', textos['index.html'].includes(FRASE));
ok('Olivenza 1297-1801 y fin de la comunidad en 1496-1497', /1297 a 1801/.test(textos['index.html']) && /1496/.test(textos['index.html']) && /1497/.test(textos['index.html']));
ok('[PENDIENTE] solo en las páginas legales', !/\[PENDIENTE\]/.test(textos['index.html'] + textos['404.html']));
ok('sin TODO ni lorem', !/\bTODO\b/.test(todo) && !/lorem ipsum/i.test(todo));
ok('licencia AT-BA-00410 en el pie', /<footer class="pie">[\s\S]*AT-BA-00410[\s\S]*<\/footer>/.test(indice));
ok('nombre legal de Booking en el pie', /<footer class="pie">[\s\S]*Apartamentos Turísticos Casa de la Judería de Olivenza[\s\S]*<\/footer>/.test(indice));
ok('teléfono 647 33 29 44 con enlace tel:+34647332944', /647 33 29 44/.test(textos['index.html']) && /href="tel:\+34647332944"/.test(indice));
ok('CTA «Consultar disponibilidad» y «Reservar en Booking»', /Consultar disponibilidad/.test(textos['index.html']) && /Reservar en Booking/.test(textos['index.html']));
ok('notas 9,7 y 5,0 sin recuento', /9,7/.test(textos['index.html']) && /5,0/.test(textos['index.html']));
ok('sin mascotas, sin aparcamiento propio, patio en el J, A para 2', /no se admiten mascotas/i.test(textos['index.html']) && /no tiene aparcamiento propio/i.test(textos['index.html']) && /Patio/.test(textos['index.html']) && /Perfecto para 2/.test(textos['index.html']));

seccion('Citas literales (contra DATOS-CASA-JUDERIA.md)');
const DATOS = fs.readFileSync(path.join(raiz, '..', 'casa-juderia-olivenza-bocetos', 'DATOS-CASA-JUDERIA.md'), 'utf8').replace(/\s+/g, ' ');
const PERMITIDAS = [
  'El piso estaba muy cuidado y preparado con mucho mimo',
  'Lo bonito, cuidado, acogedor y bien ubicado que estaba el apartamento',
  'Repetiría y lo recomendaría si lo que buscas es un sitio que te acoge en cuanto entras',
  'Javier, el anfitrión, está a tu disposición para cualquier cosa y te comparte información de la zona para que disfrutes al máximo de la estancia',
  'El dueño muy atento y nos brindó amplia información referente a la zona',
  'The apartment was huge, comfortable and in an amazing location'
];
const citas = [...indice.matchAll(/<li class="cita"[\s\S]*?<p>«([\s\S]*?)»<\/p>[\s\S]*?<p class="cita__firma">([^<]*)<\/p>/g)].map(m => ({ texto: m[1].replace(/\s+/g, ' ').trim(), firma: m[2] }));
ok('entre tres y cuatro citas', citas.length >= 3 && citas.length <= 4, citas.length + '');
for (const c of citas) {
  const sinCierre = c.texto.replace(/[.!¡?]+$/, '');
  ok('cita literal: «' + sinCierre.slice(0, 48) + '…»', DATOS.includes(sinCierre) && PERMITIDAS.includes(sinCierre));
  ok('  firmada sin nombre (Opinión en Booking/Google)', /^Opinión en (Booking|Google)$/.test(c.firma), c.firma);
}
const cartel = (indice.match(/<blockquote class="cartel"[\s\S]*?<p>«([^»]*)»/) || [])[1] || '';
ok('cita del cartel literal y atribuida', DATOS.includes(cartel.replace(/\.$/, '')) && /Miguel Ángel Vallecillo/.test(textos['index.html']), '«' + cartel + '»');

seccion('Olivenza a pie: diagrama y lista contra data/lugares.json');
const L = JSON.parse(leer('data/lugares.json')).lugares;
const puntos = [...indice.matchAll(/<g class="punto" id="punto-([a-z-]+)" data-id="[^"]*" data-n="(\d+)" data-rumbo="([\d.]+)" data-anillo="(\d)"[^>]*>\s*<circle class="punto__marca" cx="([\d.]+)" cy="([\d.]+)"/g)];
ok('un punto por lugar', puntos.length === L.length, puntos.length + ' de ' + L.length);
for (const p of puntos) {
  const l = L.find(x => x.id === p[1]);
  const dx = Number(p[5]) - 260, dy = Number(p[6]) - 260;
  const rumbo = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  const radio = Math.hypot(dx, dy);
  const dRumbo = Math.abs(((rumbo - l.rumbo + 540) % 360) - 180);
  ok(`${l.id}: rumbo ${l.rumbo}° y anillo ${l.anillo}`, Number(p[3]) === l.rumbo && dRumbo < 0.6 && Math.abs(radio - (30 + 38 * l.anillo)) < 0.6 && Number(p[4]) === l.anillo, 'dibujado a ' + rumbo.toFixed(1) + '°, r ' + radio.toFixed(1));
}
const desvios = [...indice.matchAll(/data-etiqueta-desvio="(-?[\d.]+)"/g)].map(m => Math.abs(Number(m[1])));
ok('las etiquetas se apartan como mucho 6° de su punto', Math.max(...desvios) <= 6, 'máx ' + Math.max(...desvios) + '°');
const ordenLista = [...indice.matchAll(/<li class="lugar" data-id="([a-z-]+)" data-minutos="(\d+)" data-pie-m="(\d+)"/g)];
ok('la lista va ordenada por distancia', ordenLista.every((m, i, a) => i === 0 || Number(m[3]) >= Number(a[i - 1][3])) && ordenLista.length === L.length);
ok('minutos de la lista = ceil(m/80)', ordenLista.every(m => Number(m[2]) === Math.ceil(Number(m[3]) / 80)));
ok('anillos: 1 (≤1 min), 3 (≤3), 5 (resto)', L.every(l => l.anillo === (l.minutos <= 1 ? 1 : l.minutos <= 3 ? 3 : 5)));

/* ═════════════════════ 3 · navegador ═════════════════════ */
seccion('Carga normal, escritorio 1440×900');
{
  const { ctx, pg, errores } = await abrir();
  ok('la cortina tapa al cargar', await pg.evaluate(() => getComputedStyle(document.getElementById('cortina')).display !== 'none'));
  const fuera = await esperarCortinaFuera(pg);
  ok('la cortina acaba en display:none', fuera);
  ok('con-movimiento con GSAP y sin movimiento reducido', await pg.evaluate(() => document.documentElement.classList.contains('con-movimiento')));
  ok('fuentes cargadas (titular y Commissioner)', await pg.evaluate(async () => { await document.fonts.ready; const t = getComputedStyle(document.querySelector('.titulo')).fontFamily.split(',')[0].replace(/['"]/g, '').trim(); return document.fonts.check('40px "' + t + '"') && document.fonts.check('16px Commissioner'); }));
  ok('el símbolo del héroe se ve tras la cortina', await pg.evaluate(() => getComputedStyle(document.getElementById('simbolo-heroe')).visibility === 'visible'));
  await captura(pg, '01-heroe-1440');
  /* cookies */
  ok('aviso de cookies visible al entrar', await pg.evaluate(() => { const c = document.getElementById('cookies'); return !c.hidden && getComputedStyle(c).display === 'flex'; }));
  await pg.click('#cookies-aceptar');
  ok('«De acuerdo» lo cierra de verdad', await pg.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'none' && localStorage.getItem('cdlj-cookies') === '1'));
  ok('sin ?revision no hay mando (hidden y display:none)', await pg.evaluate(() => { const m = document.getElementById('mando'); return m.hidden && getComputedStyle(m).display === 'none'; }));
  /* cursor */
  await pg.mouse.move(500, 500); await pg.mouse.move(520, 510);
  ok('cursor propio: el del sistema oculto', await pg.evaluate(() => document.documentElement.classList.contains('con-cursor') && getComputedStyle(document.body).cursor === 'none'));
  const boton = await pg.locator('.heroe__botones .boton--marca').boundingBox();
  await pg.mouse.move(boton.x + boton.width / 2, boton.y + boton.height / 2, { steps: 4 });
  await pg.waitForTimeout(450);
  ok('cursor sobre un botón: aro con relleno ≥ .35', await pg.evaluate(() => { const c = getComputedStyle(document.querySelector('.cursor__aro')).backgroundColor; const a = c.match(/rgba?\([^)]*?,\s*([\d.]+)\)$/); return document.querySelector('.cursor').classList.contains('es-activo') && a && Number(a[1]) >= 0.35; }));
  await pg.mouse.move(700, 450);
  /* recorrido con rueda (Lenis) */
  await recorrer(pg);
  ok('indicador de lectura: roseta visible y aro lleno abajo', await pg.evaluate(() => { const p = document.getElementById('progreso'); const off = parseFloat(getComputedStyle(p.querySelector('.progreso__aro')).strokeDashoffset); return p.classList.contains('es-visible') && off < 0.05; }));
  /* las pistas horizontales cargan sus fotos al desplazarse: recorrerlas también */
  for (let k = 0; k < 2; k++) {
    await pg.evaluate(async idx => {
      const p = document.querySelectorAll('.galeria__pista')[idx];
      p.scrollIntoView({ block: 'center' });
      for (let x = 0; x <= p.scrollWidth; x += p.clientWidth / 2) { p.scrollLeft = x; await new Promise(r => setTimeout(r, 300)); }
      await new Promise(r => setTimeout(r, 800));
      p.scrollLeft = 0;
    }, k);
  }
  await pg.waitForTimeout(1500);
  const estado = await pg.evaluate(() => ({
    titulos: [...document.querySelectorAll('[data-letras]')].every(t => t.classList.contains('es-visible')),
    imgs: [...document.querySelectorAll('img')].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
    sinAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
    sinMedidas: [...document.querySelectorAll('img')].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).length,
    desborde: document.documentElement.scrollWidth - window.innerWidth,
    cuentas: [...document.querySelectorAll('[data-cuenta]')].map(e => e.textContent)
  }));
  ok('todos los titulares revelados tras recorrer con la rueda', estado.titulos);
  ok('todas las imágenes cargadas', estado.imgs.length === 0, estado.imgs.slice(0, 3).join(' '));
  ok('todas las imágenes con alt, width y height', estado.sinAlt === 0 && estado.sinMedidas === 0);
  ok('sin desbordamiento horizontal', estado.desborde <= 0, estado.desborde + ' px');
  ok('contadores terminan en 9,7 y 5,0', estado.cuentas.every(t => t === '9,7' || t === '5,0'), estado.cuentas.join(' '));
  /* mapa */
  ok('antes del clic no hay iframe de Google', await pg.evaluate(() => !document.querySelector('iframe')));
  await pg.locator('#mapa-boton').scrollIntoViewIfNeeded();
  await pg.click('#mapa-boton');
  ok('el clic carga el mapa (output=embed)', await pg.evaluate(() => { const f = document.querySelector('.mapa iframe'); return !!f && /output=embed/.test(f.src) && !!f.title; }));
  /* galerías */
  const gal = await pg.evaluate(() => [...document.querySelectorAll('[data-galeria]')].map(g => { const p = g.querySelector('.galeria__pista'); return { desborda: p.scrollWidth > p.clientWidth + 2, tab: p.getAttribute('tabindex'), cuenta: g.querySelector('.galeria__cuenta').textContent }; }));
  ok('galerías: enfocables solo si desbordan', gal.every(g => g.desborda === (g.tab === '0')), JSON.stringify(gal.map(g => g.cuenta)));
  await pg.locator('#ficha-j .galeria__flecha[data-dir="1"]').scrollIntoViewIfNeeded();
  await pg.click('#ficha-j .galeria__flecha[data-dir="1"]');
  await pg.waitForTimeout(900);
  ok('la flecha avanza la galería del J', await pg.evaluate(() => document.querySelector('#ficha-j .galeria__pista').scrollLeft > 50 && !/^Foto 1 de/.test(document.querySelector('#ficha-j .galeria__cuenta').textContent)));
  /* diagrama */
  await irA(pg, '#olivenza');
  await pg.hover('.lugar[data-id="esnoga"]');
  ok('pasar por la lista señala su punto y su rayo', await pg.evaluate(() => document.querySelector('#punto-esnoga').classList.contains('es-activo') && document.querySelector('.rayo[data-id="esnoga"]').classList.contains('es-activo')));
  ok('consola limpia, sin 404 (escritorio)', errores.length === 0, errores.slice(0, 4).join(' | '));
  if (CAPTURAS) {
    for (const [sel, nombre] of [['#chimenea', '02-chimenea'], ['#apartamentos', '03-apartamentos'], ['#ficha-j', '04-fichas'], ['#olivenza', '05-olivenza'], ['.historia', '06-historia'], ['#opiniones', '07-opiniones'], ['#llegar', '08-llegar'], ['.llamar', '09-llamar'], ['.pie', '10-pie']]) {
      await irA(pg, sel); await pg.waitForTimeout(900); await captura(pg, nombre + '-1440');
    }
  }
  await ctx.close();
}

seccion('Cortina «el compás»: fotogramas, autoRound y aterrizaje');
{
  /* autoRound: muestrear el dashoffset del círculo en el tiempo desde el primer fotograma
     (un script de arranque; tras el «load» de Playwright el trazo ya ha terminado) */
  const { ctx, pg } = await abrir({
    cookiesVistas: true,
    init: () => {
      window.__muestras = [];
      const paso = () => {
        const c = document.querySelector('.cortina__simbolo .traza__circulo');
        if (c) window.__muestras.push(parseFloat(getComputedStyle(c).strokeDashoffset));
        if (window.__muestras.length < 240) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }
  });
  await pg.waitForFunction(() => window.__cortina && window.__cortina.time() > 0.8, null, { timeout: 6000 });
  const muestras = await pg.evaluate(() => window.__muestras.slice());
  const intermedias = muestras.filter(v => v > 0.04 && v < 0.96).length;
  ok('el círculo se traza (autoRound:false): valores intermedios del dashoffset', intermedias >= 5, intermedias + ' de ' + muestras.length + ' muestras entre 0 y 1');
  /* fotograma a mitad: pausar y buscar */
  await pg.evaluate(() => { window.__cortina.pause(); window.__cortina.seek(0.82, false); 0; });
  await pg.waitForTimeout(120);
  const mitad = await pg.evaluate(() => {
    const c = document.getElementById('cortina'); const pet = [...c.querySelectorAll('.traza__petalo')].map(p => parseFloat(getComputedStyle(p).strokeDashoffset));
    return { tapa: getComputedStyle(c).display !== 'none', panel: getComputedStyle(c.querySelector('.cortina__panel')).backgroundColor, fondo: getComputedStyle(document.body).backgroundColor, petalos: pet };
  });
  ok('a mitad (0,82 s): la cortina tapa y hay arcos a medio trazar', mitad.tapa && mitad.petalos.some(v => v > 0.05 && v < 0.95) && mitad.petalos.some(v => v < 0.05), mitad.petalos.map(v => v.toFixed(2)).join(' '));
  ok('la cortina es de otro color que el fondo que destapa', mitad.panel !== mitad.fondo, mitad.panel + ' vs ' + mitad.fondo);
  await captura(pg, '00-cortina-a-0,82s');
  await pg.evaluate(() => { window.__cortina.seek(1.62, false); 0; });
  await pg.waitForTimeout(80);
  ok('a 1,62 s: dos rosetas separadas y la cruz subiendo', await pg.evaluate(() => {
    const s = document.querySelector('.cortina__simbolo'); const i = s.querySelector('.simbolo__roseta--izq').getAttribute('transform'); const d = s.querySelector('.simbolo__roseta--der').getAttribute('transform');
    return i !== d && Number(getComputedStyle(s.querySelector('.simbolo__roseta--der')).opacity) > 0.9;
  }));
  await captura(pg, '00-cortina-b-1,62s');
  await pg.evaluate(() => { window.__cortina.seek(1.92, false); 0; });
  await pg.waitForTimeout(80);
  ok('a 1,92 s: la crema se está retirando', await pg.evaluate(() => { const r = document.querySelector('.cortina__panel').getBoundingClientRect(); return r.bottom < innerHeight - 20 && r.bottom > 0; }));
  await captura(pg, '00-cortina-c-1,92s');
  await pg.evaluate(() => { const t = window.__cortina; t.seek(t.duration() - 0.0005, false); 0; });
  await pg.waitForTimeout(80);
  const aterrizaje = await pg.evaluate(() => {
    const a = document.querySelector('.cortina__simbolo').getBoundingClientRect(); const b = document.getElementById('simbolo-heroe').getBoundingClientRect();
    return { dx: a.left - b.left, dy: a.top - b.top, dw: a.width - b.width, dh: a.height - b.height };
  });
  ok('el símbolo aterriza a ±2 px de su sitio', Object.values(aterrizaje).every(v => Math.abs(v) <= 2), JSON.stringify(Object.fromEntries(Object.entries(aterrizaje).map(([k, v]) => [k, Math.round(v * 10) / 10]))));
  ok('la cortina dura ≤ 2,2 s', await pg.evaluate(() => window.__cortina.duration() <= 2.2001), String(await pg.evaluate(() => window.__cortina.duration().toFixed(2))));
  await pg.evaluate(() => { window.__cortina.play(); 0; });
  ok('al terminar: cortina en display:none', await esperarCortinaFuera(pg));
  ok('el símbolo real queda visible y el clon desaparece', await pg.evaluate(() => getComputedStyle(document.getElementById('simbolo-heroe')).visibility === 'visible' && !document.querySelector('.cortina__simbolo')));
  ok('la cortina no se repite en la misma sesión', await (async () => { await pg.reload({ waitUntil: 'load' }); return pg.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'); })());
  await ctx.close();
}
{
  const { ctx, pg, errores } = await abrir({ sinGsap: true });
  await pg.waitForTimeout(400);
  ok('sin GSAP: la cortina se retira (display:none)', await pg.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'));
  ok('sin GSAP: sin con-movimiento y titulares visibles', await pg.evaluate(() => !document.documentElement.classList.contains('con-movimiento') && [...document.querySelectorAll('.letra')].every(l => getComputedStyle(l).opacity === '1')));
  ok('sin GSAP: el símbolo del héroe visible', await pg.evaluate(() => getComputedStyle(document.getElementById('simbolo-heroe')).visibility === 'visible'));
  ok('sin GSAP: sin errores de página', errores.filter(e => /pageerror/.test(e)).length === 0, errores.join(' | '));
  await captura(pg, '11-sin-gsap', { fullPage: true });
  await ctx.close();
}
{
  const { ctx, pg } = await abrir({ reducido: true });
  await pg.waitForTimeout(400);
  ok('movimiento reducido: la cortina no sale', await pg.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'));
  ok('movimiento reducido: sin con-movimiento, contenido visible', await pg.evaluate(() => !document.documentElement.classList.contains('con-movimiento') && [...document.querySelectorAll('[data-aparece]')].every(e => getComputedStyle(e).opacity === '1')));
  await pg.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); 0; });
  await pg.waitForTimeout(500);
  ok('movimiento reducido: el contenido sigue cambiando (aro de lectura lleno)', await pg.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.progreso__aro')).strokeDashoffset) < 0.05));
  ok('movimiento reducido: la roseta del sol no gira', await pg.evaluate(() => { const t = getComputedStyle(document.getElementById('sol')).transform; return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'; }));
  await captura(pg, '12-reducido', { fullPage: true });
  await ctx.close();
}

seccion('Elegidor: las cuatro combinaciones, ninguna ficha se oculta');
{
  const { ctx, pg } = await abrir({ cookiesVistas: true });
  await esperarCortinaFuera(pg);
  await irA(pg, '#elegidor');
  const casos = [['2', 'terraza', 'A'], ['2', 'banos', 'J'], ['34', 'terraza', 'J'], ['34', 'banos', 'J']];
  for (const [c, i, esperado] of casos) {
    await pg.click('#elegidor-reiniciar').catch(() => {});
    await pg.click(`.opcion[data-pregunta="cuantos"][data-valor="${c}"]`);
    await pg.click(`.opcion[data-pregunta="importa"][data-valor="${i}"]`);
    await pg.waitForTimeout(120);
    const r = await pg.evaluate(() => ({
      J: document.getElementById('ficha-j').classList.contains('es-elegida'),
      A: document.getElementById('ficha-a').classList.contains('es-elegida'),
      visibles: ['ficha-j', 'ficha-a'].filter(id => { const f = document.getElementById(id); const s = getComputedStyle(f); return s.display !== 'none' && s.visibility === 'visible' && Number(s.opacity) === 1 && f.offsetHeight > 200; }).length,
      pulsados: [...document.querySelectorAll('.opcion[aria-pressed="true"]')].map(b => b.dataset.valor).join('+'),
      texto: document.getElementById('elegidor-respuesta').textContent
    }));
    const nombre = { '2': '2', '34': '3–4' }[c] + ' + ' + { terraza: 'terraza', banos: 'dos baños' }[i];
    ok(`${nombre} → ${esperado}`, r[esperado] && !r[esperado === 'J' ? 'A' : 'J'] && r.visibles === 2 && r.pulsados === c + '+' + i && new RegExp('el ' + esperado).test(r.texto), r.texto.slice(0, 60));
  }
  ok('región aria-live en la respuesta', await pg.evaluate(() => document.getElementById('elegidor-respuesta').getAttribute('aria-live') === 'polite'));
  await captura(pg, '13-elegidor');
  await ctx.close();
}

seccion('Héroe en móvil: el texto nunca pisa el símbolo');
for (const [w, hgt] of [[360, 640], [375, 667], [390, 844], [768, 1024]]) {
  const { ctx, pg } = await abrir({ ancho: w, alto: hgt, cookiesVistas: true });
  await esperarCortinaFuera(pg);
  await pg.waitForTimeout(1600);
  const m = await pg.evaluate(() => {
    const placa = document.querySelector('.heroe__placa').getBoundingClientRect();
    const sim = document.getElementById('simbolo-heroe').getBoundingClientRect();
    const rot = document.querySelector('.heroe__rotulo').getBoundingClientRect();
    const texto = document.querySelector('.heroe__texto').getBoundingClientRect();
    const tit = document.querySelector('.heroe__titulo').getBoundingClientRect();
    const cab = document.getElementById('cabecera').getBoundingClientRect();
    return { solape: rot.bottom - tit.top, bajoCabecera: sim.top - cab.bottom, desborde: document.documentElement.scrollWidth - innerWidth, anchoTexto: texto.width };
  });
  ok(`${w}×${hgt}: símbolo bajo la cabecera, rótulo sobre el titular, sin desborde`, m.bajoCabecera >= 0 && m.solape <= 0 && m.desborde <= 0, JSON.stringify(m));
  await captura(pg, `14-heroe-${w}x${hgt}`);
  await ctx.close();
}

seccion('Menú móvil bajo backdrop-filter (390×844, cabecera ya fija)');
{
  const { ctx, pg, errores } = await abrir({ ancho: 390, alto: 844, cookiesVistas: true });
  await esperarCortinaFuera(pg);
  await recorrer(pg, 420);
  await pg.evaluate(() => { window.scrollTo(0, 1800); 0; });
  await pg.waitForTimeout(500);
  ok('la cabecera lleva backdrop-filter', await pg.evaluate(() => /blur/.test(getComputedStyle(document.getElementById('cabecera')).backdropFilter || getComputedStyle(document.getElementById('cabecera')).webkitBackdropFilter)));
  await pg.click('#boton-menu');
  await pg.waitForTimeout(900);
  const menu = await pg.evaluate(() => { const r = document.getElementById('menu').getBoundingClientRect(); const a = document.querySelector('.menu__lista a'); const ra = a.getBoundingClientRect(); const hit = document.elementFromPoint(ra.left + ra.width / 2, ra.top + ra.height / 2); return { top: r.top, alto: r.height, vh: innerHeight, ancho: r.width, vw: innerWidth, pulsable: a === hit || a.contains(hit), exp: document.getElementById('boton-menu').getAttribute('aria-expanded') }; });
  ok('el menú ocupa toda la pantalla (100dvh) y sus enlaces se pueden pulsar', menu.top === 0 && Math.abs(menu.alto - menu.vh) < 2 && Math.abs(menu.ancho - menu.vw) < 2 && menu.pulsable && menu.exp === 'true', JSON.stringify(menu));
  await captura(pg, '15-menu-390');
  await pg.click('#boton-menu', { timeout: 3000 });
  await pg.waitForTimeout(900);
  ok('el botón lo vuelve a cerrar (aria-expanded=false)', await pg.evaluate(() => document.getElementById('boton-menu').getAttribute('aria-expanded') === 'false' && getComputedStyle(document.getElementById('menu')).visibility === 'hidden'));
  ok('consola limpia (móvil)', errores.length === 0, errores.slice(0, 3).join(' | '));
  if (CAPTURAS) {
    await pg.evaluate(() => { window.scrollTo(0, 0); 0; });
    await pg.waitForTimeout(400);
    for (const [sel, nombre] of [['.heroe', '20-heroe'], ['#chimenea', '21-chimenea'], ['#elegidor', '22-elegidor'], ['#ficha-j', '23-ficha-j'], ['#ficha-a', '24-ficha-a'], ['#olivenza', '25-olivenza'], ['.lugares', '26-lugares'], ['#opiniones', '27-opiniones'], ['#llegar', '28-normas'], ['.como-llegar', '29-llegar'], ['.pie', '30-pie']]) {
      await irA(pg, sel); await pg.waitForTimeout(1000); await captura(pg, nombre + '-390');
    }
  }
  await ctx.close();
}

seccion('Contraste AA de los tokens, en las tres paletas (medido en el navegador)');
{
  const { ctx, pg } = await abrir({ extra: '?revision', cookiesVistas: true });
  await esperarCortinaFuera(pg);
  for (const paleta of ['real', 'azul', 'oliva']) {
    await pg.click(`[data-paleta="${paleta}"]`);
    const pares = await pg.evaluate(() => {
      const caja = document.createElement('div'); document.body.appendChild(caja);
      const color = v => { caja.style.color = `var(${v})`; const c = getComputedStyle(caja).color; return c; };
      const rgb = c => { const m = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : Number(m[4])]; const n = c.match(/[\d.]+/g).map(Number); return [n[0], n[1], n[2], n[3] === undefined ? 1 : n[3]]; };
      const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const componer = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3]));
      const ratio = (f, b) => { const bb = rgb(color(b)); const ff = componer(rgb(color(f)), bb); const a = L(ff), z = L(bb); return (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05); };
      const lista = [['--tinta', '--papel', 4.5], ['--tinta', '--cal', 4.5], ['--tinta-suave', '--papel', 4.5], ['--tinta-suave', '--cal', 4.5], ['--marca', '--papel', 4.5], ['--marca', '--cal', 4.5], ['--miel-texto', '--papel', 4.5], ['--miel-texto', '--cal', 4.5], ['--crema', '--marca-hondo', 4.5], ['--crema-suave', '--marca-hondo', 4.5], ['--miel-claro', '--marca-hondo', 4.5], ['--crema', '--marca', 4.5], ['--miel', '--papel', 3], ['--miel', '--marca-hondo', 3]];
      const out = lista.map(([f, b, min]) => ({ par: f + ' / ' + b, r: ratio(f, b), min }));
      caja.remove(); return out;
    });
    const malos = pares.filter(p => p.r < p.min);
    ok(`paleta ${paleta}: ${pares.length} parejas en AA (miel decorativo ≥ 3)`, malos.length === 0, malos.length ? malos.map(p => p.par + ' ' + p.r.toFixed(2)).join(', ') : 'mín ' + Math.min(...pares.map(p => p.r)).toFixed(2));
  }
  await ctx.close();
}
{
  /* el texto del héroe en móvil va sobre la foto: medir el fondo real bajo el titular */
  const { ctx, pg } = await abrir({ ancho: 390, alto: 844, cookiesVistas: true });
  await esperarCortinaFuera(pg); await pg.waitForTimeout(1600);
  await pg.addStyleTag({ content: '.heroe__texto *{color:transparent!important;border-color:transparent!important;background:transparent!important;text-shadow:none!important}' });
  const caja = await pg.evaluate(() => { const a = document.querySelector('.heroe__ante').getBoundingClientRect(), n = document.querySelector('.heroe__notas').getBoundingClientRect(); return { x: 0, y: a.top, width: innerWidth, height: n.bottom - a.top }; });
  const buf = await pg.screenshot({ clip: caja });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let peor = 0;
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  for (let i = 0; i < data.length; i += info.channels) peor = Math.max(peor, 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]));
  const crema = 0.2126 * lin(0xF4) + 0.7152 * lin(0xEF) + 0.0722 * lin(0xE4);
  const r = (crema + 0.05) / (peor + 0.05);
  ok('móvil: antetítulo, titular y notas sobre la foto velada ≥ 4,5:1 en el píxel más claro', r >= 4.5, r.toFixed(2) + ':1');
  await ctx.close();
}

seccion('Dos densidades × tres paletas (?revision)');
{
  const { ctx, pg } = await abrir({ extra: '?revision' });
  await esperarCortinaFuera(pg);
  ok('con ?revision y el aviso de cookies en pantalla, el mando se aparta', await pg.evaluate(() => !document.getElementById('mando').hidden && getComputedStyle(document.getElementById('mando')).display === 'none'));
  await pg.click('#cookies-aceptar');
  ok('al cerrar el aviso, el mando aparece', await pg.evaluate(() => getComputedStyle(document.getElementById('mando')).display !== 'none'));
  const marcas = {};
  for (const densidad of ['roseta', 'sobria']) {
    for (const paleta of ['real', 'azul', 'oliva']) {
      await pg.click(`[data-densidad="${densidad}"]`);
      await pg.click(`[data-paleta="${paleta}"]`);
      await pg.waitForTimeout(150);
      const e = await pg.evaluate(() => {
        const vis = s => { const el = document.querySelector(s); return !!el && getComputedStyle(el).display !== 'none'; };
        return {
          clase: document.documentElement.className,
          diagrama: vis('.diagrama'), comparativa: vis('.comparativa'), frisoDibujo: vis('.friso:not(.friso--cortina) svg'), vinetas: vis('.claves .vineta'), progreso: vis('.progreso'),
          minGrande: parseFloat(getComputedStyle(document.querySelector('.lugar__min')).fontSize),
          titulo: getComputedStyle(document.querySelector('#apartamentos .titulo')).color,
          hondo: getComputedStyle(document.querySelector('.chimenea')).backgroundColor,
          logo: getComputedStyle(document.getElementById('simbolo-heroe')).fill,
          desborde: document.documentElement.scrollWidth - innerWidth,
          pulsados: [...document.querySelectorAll('#mando [aria-pressed="true"]')].map(b => b.dataset.densidad || b.dataset.paleta).join('+'),
          guardado: localStorage.getItem('cdlj-densidad') + '+' + localStorage.getItem('cdlj-paleta'),
          solHero: vis('#sol')
        };
      });
      marcas[densidad + '-' + paleta] = e;
      const esperado = densidad === 'roseta'
        ? e.diagrama && !e.comparativa && e.frisoDibujo && e.vinetas
        : !e.diagrama && e.comparativa && !e.frisoDibujo && !e.vinetas && !e.progreso && e.minGrande > 40;
      ok(`${densidad} × ${paleta}: piezas en su sitio, sin desborde, aria-pressed y guardado`, esperado && e.solHero && e.desborde <= 0 && e.pulsados === densidad + '+' + paleta && e.guardado === densidad + '+' + paleta, densidad === 'sobria' ? 'minutos a ' + e.minGrande + 'px' : '');
      await irA(pg, densidad === 'sobria' ? '#olivenza' : '#chimenea');
      await captura(pg, `16-${densidad}-${paleta}`);
    }
  }
  const t = [marcas['roseta-real'].titulo, marcas['roseta-azul'].titulo, marcas['roseta-oliva'].titulo];
  ok('cada paleta cambia de verdad el color computado (titular y fondo oscuro)', new Set(t).size === 3 && new Set([marcas['roseta-real'].hondo, marcas['roseta-azul'].hondo, marcas['roseta-oliva'].hondo]).size === 3, t.join(' · '));
  ok('el logo no cambia de color entre paletas', new Set(Object.values(marcas).map(m => m.logo)).size === 1, marcas['roseta-real'].logo);
  /* recarga: la elección guardada se aplica antes del primer pintado */
  await pg.click('[data-densidad="sobria"]'); await pg.click('[data-paleta="azul"]');
  const claseCarga = await (async () => { await pg.reload({ waitUntil: 'domcontentloaded' }); return pg.evaluate(() => document.documentElement.className); })();
  ok('al recargar con ?revision, sobria y azul desde el primer pintado', /densidad-sobria/.test(claseCarga) && /paleta-azul/.test(claseCarga), claseCarga);
  await pg.goto(URL, { waitUntil: 'domcontentloaded' });
  ok('sin ?revision, la elección guardada NO se aplica', await pg.evaluate(() => /densidad-roseta/.test(document.documentElement.className) && /paleta-real/.test(document.documentElement.className)));
  await pg.goto(URL + '?revision', { waitUntil: 'load' });
  await pg.click('[data-densidad="roseta"]'); await pg.click('[data-paleta="real"]');
  ok('y se puede volver a «Roseta» y al marrón del logo', await pg.evaluate(() => /densidad-roseta/.test(document.documentElement.className) && /paleta-real/.test(document.documentElement.className)));
  await ctx.close();
}

seccion('Receta de borrado del mando (comprobada contra los archivos)');
{
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'cdlj-entrega-'));
  let salida = '', codigo = 0;
  try {
    execFileSync(process.execPath, [path.join(raiz, 'scripts/quitar-mando.mjs'), destino], { stdio: 'pipe' });
    salida = execFileSync(process.execPath, [path.join(raiz, 'scripts/comprobar-borrado.mjs'), destino], { stdio: 'pipe' }).toString();
  } catch (e) { codigo = e.status || 1; salida = String(e.stdout || e.message); }
  ok('quitar-mando + comprobar-borrado: sin rastros y sin piezas perdidas', codigo === 0 && /Se puede entregar/.test(salida), salida.trim().split('\n').pop());
  const s2 = await servir(destino, PUERTO + 1);
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage(); const err = [];
  pg.on('pageerror', e => err.push(e.message));
  await pg.goto(`http://127.0.0.1:${PUERTO + 1}/?revision`, { waitUntil: 'load' });
  ok('la copia de entrega carga sin errores y sin mando aun con ?revision', err.length === 0 && await pg.evaluate(() => !document.getElementById('mando') && !document.getElementById('comparativa') && /densidad-roseta/.test(document.documentElement.className)), err.join(' | '));
  ok('la copia de entrega retira la cortina', await esperarCortinaFuera(pg));
  await ctx.close(); s2.close();
  fs.rmSync(destino, { recursive: true, force: true });
}

seccion('404 y páginas legales');
{
  const { ctx, pg, errores } = await abrir({ extra: 'no-existe.html' });
  ok('la 404 se sirve con su diseño', await pg.evaluate(() => /Por aquí no se sube/.test(document.body.textContent) && !!document.querySelector('.error__sol use')));
  await captura(pg, '17-404');
  for (const p of ['aviso-legal.html', 'privacidad.html']) {
    await pg.goto(URL + p, { waitUntil: 'load' });
    ok(p + ' carga con su rótulo y licencia/claves', await pg.evaluate(() => document.querySelectorAll('svg use').length > 0 && /AT-BA-00410|cdlj-cookies/.test(document.body.textContent)));
  }
  ok('legales sin errores (salvo el 404 buscado)', errores.filter(e => !/no-existe|status of 404/.test(e)).length === 0, errores.join(' | '));
  await ctx.close();
}

await navegador.close();
servidor.close();
console.log(`\n${total - fallos}/${total} comprobaciones correctas` + (fallos ? ` · ${fallos} FALLO(S)` : ''));
process.exitCode = fallos ? 1 : 0;
