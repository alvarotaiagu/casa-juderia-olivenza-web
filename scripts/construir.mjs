/* Construye las partes de index.html que salen de los datos. Idempotente.

   1 · Fotos. Rellena cada <picture data-foto="ID" …></picture> con sus fuentes
       AVIF/WebP/JPG a partir de data/fotos.json (alt, ancho, alto, versiones).
         data-foto   id (b06, b12j…)               obligatorio
         data-sizes  atributo sizes                  por defecto 100vw
         data-carga  eager | lazy                    por defecto lazy (eager añade fetchpriority)
         data-alt    sustituye al alt de fotos.json  "" = decorativa
   2 · Olivenza a pie. Desde data/lugares.json escribe, entre marcas:
         <!-- lugares-lista:inicio -->      los <li> de la lista (ordenada por distancia)
         <!-- lugares-diagrama:inicio -->   el diagrama en SVG, estático (se ve sin JS)
       En el diagrama, cada PUNTO va en su rumbo real y en su anillo, sin mover
       (verificar.mjs lo comprueba contra el JSON); solo la ETIQUETA con el número
       se separa unos grados si choca con otra (se apunta la desviación).

   node scripts/construir.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = f => JSON.parse(fs.readFileSync(path.join(raiz, f), 'utf8'));
const fotos = Object.fromEntries(leer('data/fotos.json').fotos.map(f => [f.id, f]));
const lugares = leer('data/lugares.json');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const attr = (t, n) => { const m = t.match(new RegExp('\\s' + n + '="([^"]*)"')); return m ? m[1] : null; };
const r1 = v => Math.round(v * 10) / 10;

export function picture(id, { sizes = '100vw', carga = 'lazy', alt = null, sangria = '' } = {}) {
  const f = fotos[id];
  if (!f || !f.anchos) throw new Error('No está en data/fotos.json (o sin versiones): ' + id);
  const set = ext => f.anchos.map(a => `assets/fotos/${id}-${a}.${ext} ${a}w`).join(', ');
  const mayor = f.anchos[f.anchos.length - 1];
  const alto = Math.round(f.h * mayor / f.w);
  const extra = carga === 'eager' ? ' fetchpriority="high"' : ' loading="lazy"';
  return [
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`,
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`,
    `<img src="assets/fotos/${id}-${mayor}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${mayor}" height="${alto}" alt="${esc(alt ?? f.alt)}" decoding="async"${extra}>`
  ].map(l => sangria + l).join('\n');
}

/* ───────────── diagrama ───────────── */
const D = { lado: 520, c: 260, radio: min => 30 + 38 * min, etiqueta: 13, punto: 5.5, separacion: 3 };
const polar = (rumbo, r) => [D.c + r * Math.sin(rumbo * Math.PI / 180), D.c - r * Math.cos(rumbo * Math.PI / 180)];

function etiquetas() {
  /* por anillo: ángulos de las etiquetas a R + 22, separados lo justo para no tocarse */
  const salida = {};
  for (const anillo of [1, 3, 5]) {
    const grupo = lugares.lugares.filter(l => l.anillo === anillo).map(l => ({ id: l.id, real: l.rumbo, a: l.rumbo }))
      .sort((x, y) => x.real - y.real);
    const R = D.radio(anillo) + 22;
    const minimo = (2 * D.etiqueta + D.separacion) / R * 180 / Math.PI;
    for (let vuelta = 0; vuelta < 400; vuelta++) {
      let movido = false;
      for (let i = 0; i < grupo.length - 1; i++) {
        const hueco = grupo[i + 1].a - grupo[i].a;
        if (hueco < minimo) {
          const falta = (minimo - hueco) / 2 + 0.01;
          grupo[i].a -= falta; grupo[i + 1].a += falta; movido = true;
        }
      }
      if (!movido) break;
    }
    for (const g of grupo) salida[g.id] = { a: g.a, R };
  }
  return salida;
}

function diagrama(sangria) {
  const s = sangria;
  const et = etiquetas();
  const out = [];
  out.push(`${s}<svg class="diagrama__svg" viewBox="0 0 ${D.lado} ${D.lado}" role="img" aria-labelledby="diagrama-pie" focusable="false">`);
  for (const m of [5, 3, 1]) {
    const R = D.radio(m);
    out.push(`${s}  <circle class="diagrama__anillo" cx="${D.c}" cy="${D.c}" r="${R}" data-minutos="${m}"/>`);
    const [x, y] = polar(252, R);
    out.push(`${s}  <text class="diagrama__minutos" x="${r1(x)}" y="${r1(y - 6)}" text-anchor="middle">${m} min</text>`);
  }
  const [nx, ny] = polar(0, D.radio(5) + 22);
  out.push(`${s}  <g class="diagrama__norte"><path d="M${D.c} ${r1(ny + 12)}V${r1(D.c - D.radio(5) + 4)}"/><text x="${D.c}" y="${r1(ny + 4)}" text-anchor="middle">N</text></g>`);
  out.push(`${s}  <g class="diagrama__rayos">`);
  for (const l of lugares.lugares) {
    const [x0, y0] = polar(l.rumbo, 50); const [x1, y1] = polar(l.rumbo, D.radio(l.anillo) - D.punto - 2);
    out.push(`${s}    <path class="rayo" data-id="${l.id}" d="M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}"/>`);
  }
  out.push(`${s}  </g>`);
  out.push(`${s}  <use class="diagrama__casa" href="#s-roseta" x="${D.c - 44}" y="${D.c - 44}" width="88" height="88"/>`);
  for (const l of lugares.lugares) {
    const [px, py] = polar(l.rumbo, D.radio(l.anillo));
    const { a, R } = et[l.id];
    const [ex, ey] = polar(a, R);
    out.push(`${s}  <g class="punto" id="punto-${l.id}" data-id="${l.id}" data-n="${l.n}" data-rumbo="${l.rumbo}" data-anillo="${l.anillo}" data-pie-m="${l.pie_m}" data-etiqueta-desvio="${r1(a - l.rumbo)}">`);
    out.push(`${s}    <circle class="punto__marca" cx="${r1(px)}" cy="${r1(py)}" r="${D.punto}"/>`);
    out.push(`${s}    <circle class="punto__etiqueta" cx="${r1(ex)}" cy="${r1(ey)}" r="${D.etiqueta}"/>`);
    out.push(`${s}    <text class="punto__numero" x="${r1(ex)}" y="${r1(ey + 5)}" text-anchor="middle">${l.n}</text>`);
    out.push(`${s}  </g>`);
  }
  out.push(`${s}</svg>`);
  return out.join('\n');
}

function lista(sangria) {
  const s = sangria;
  return lugares.lugares.map(l => [
    `${s}<li class="lugar" data-id="${l.id}" data-minutos="${l.minutos}" data-pie-m="${l.pie_m}">`,
    `${s}  <span class="lugar__n" aria-hidden="true">${l.n}</span>`,
    `${s}  <span class="lugar__nombre">${esc(l.corto)}</span>`,
    `${s}  <span class="lugar__tiempo"><b class="lugar__min">${l.minutos}</b> min <span class="lugar__m">· unos ${l.pie_m} m</span></span>`,
    `${s}  <span class="lugar__texto">${esc(l.texto)}</span>`,
    `${s}</li>`
  ].join('\n')).join('\n');
}

function entreMarcas(html, marca, contenido) {
  const ini = `<!-- ${marca}:inicio -->`, fin = `<!-- ${marca}:fin -->`;
  const a = html.indexOf(ini), b = html.indexOf(fin);
  if (a < 0 || b < a) throw new Error('Falta la marca ' + marca);
  const sangria = html.slice(html.lastIndexOf('\n', a) + 1, a);
  return html.slice(0, a + ini.length) + '\n' + contenido + '\n' + sangria + html.slice(b);
}

const paginas = process.argv.slice(2).filter(a => a.endsWith('.html'));
for (const pagina of paginas.length ? paginas : ['index.html']) {
  const ruta = path.join(raiz, pagina);
  const antes = fs.readFileSync(ruta, 'utf8');
  let n = 0;
  let despues = antes.replace(/([ \t]*)<picture([^>]*\sdata-foto="([a-z0-9]+)"[^>]*)>[\s\S]*?<\/picture>/g, (todo, sangria, atributos, id) => {
    n++;
    const dentro = picture(id, {
      sizes: attr(atributos, 'data-sizes') || '100vw',
      carga: attr(atributos, 'data-carga') || 'lazy',
      alt: attr(atributos, 'data-alt'),
      sangria: sangria + '  '
    });
    return `${sangria}<picture${atributos}>\n${dentro}\n${sangria}</picture>`;
  });
  if (despues.includes('<!-- lugares-lista:inicio -->')) {
    despues = entreMarcas(despues, 'lugares-lista', lista('            '));
    despues = entreMarcas(despues, 'lugares-diagrama', diagrama('          '));
  }
  if (despues.length < antes.length * 0.8) throw new Error('Me niego: ' + pagina + ' perdería demasiado');
  if (despues !== antes) fs.writeFileSync(ruta, despues);
  console.log((despues !== antes ? 'actualizado ' : 'sin cambios ') + pagina + ' · ' + n + ' fotos');
}
const et = etiquetas();
console.log('desvío de etiquetas (º):', Object.entries(et).map(([k, v]) => k + ' ' + r1(v.a - lugares.lugares.find(l => l.id === k).rumbo)).join(', '));
