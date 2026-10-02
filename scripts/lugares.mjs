#!/usr/bin/env node
// Rumbo (azimut) y distancias de 10 lugares de Olivenza desde la casa
// (C/ Santiago 7), con coordenadas de OpenStreetMap.
//
// Uso (Node 22, sin dependencias):
//   node scripts/lugares.mjs            -> pide coordenadas a Overpass (o a la API de OSM),
//                                          recalcula la ruta a pie con OSRM y escribe data/lugares.json
//   node scripts/lugares.mjs --sin-red  -> no usa la red: lee data/lugares.json, recalcula
//                                          rumbo, recta, minutos y anillo desde las lat/lon guardadas
//
// Reglas:
//   rumbo   = azimut inicial esférico desde el origen (0-360, desde el norte, sentido horario)
//   recta_m = haversine
//   pie_m   = distancia a pie de CONTEXTO-JUDERIA.md §1.4 (OSRM, 2026-10-02); el recálculo
//             OSRM se guarda en pie_osrm_m y, si difiere más de un 15 %, se anota en pie_aviso
//   minutos = ceil(pie_m / 80)        anillo = 1 (≤ 1 min) · 3 (≤ 3 min) · 5 (resto)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = resolve(AQUI, '../data/lugares.json');
const UA = 'casa-juderia-olivenza-web/1.0 (scripts/lugares.mjs; diagrama radial de lugares cercanos)';
const HOY = new Date().toISOString().slice(0, 10);
const FECHA_CONTEXTO = '2026-10-02';
const R_TIERRA = 6371008.8; // radio medio (m)

const ORIGEN = {
  nombre: 'Casa de la Judería · C/ Santiago 7A',
  lat: 38.6860622,
  lon: -7.1012492,
  fuente: 'Nominatim «7, Calle Santiago, Olivenza» → edificio way/1049680372 (https://www.openstreetmap.org/way/1049680372), 2026-10-02',
};

// punto: 'nodo' | 'centroide' (media de los nodos únicos de la vía) | 'extremo' (extremo de la vía más cercano al origen)
// pie: distancia a pie de CONTEXTO-JUDERIA.md §1.4
// espera: comprobación de las etiquetas OSM del elemento
const LUGARES = [
  { id: 'magdalena', nombre: 'Iglesia de la Magdalena', osm: ['way', 183313818], punto: 'centroide', pie: 80,
    espera: (t) => /Magdalena/i.test(t.name ?? '') },
  { id: 'ayuntamiento', nombre: 'Ayuntamiento', osm: ['node', 6865900018], punto: 'nodo', pie: 80,
    espera: (t) => t.amenity === 'townhall' || /Ayuntamiento|Constituci/i.test(t.name ?? '') },
  { id: 'esnoga', nombre: 'Calle Moreno Nieto, antigua rua da Esnoga', osm: ['way', 183313927], punto: 'extremo', pie: 110,
    nota: 'la calle de la sinagoga medieval, hoy calle Moreno Nieto',
    espera: (t) => /Moreno Nieto/i.test(t.name ?? '') },
  { id: 'santa-maria', nombre: 'Iglesia de Santa María del Castillo', osm: ['way', 560034728], punto: 'centroide', pie: 175,
    espera: (t) => /Santa Mar[ií]a del Castillo/i.test(t.name ?? '') },
  { id: 'centro-judaico', nombre: 'Centro de Interpretación del Pasado Judaico', osm: ['way', 1006251162], punto: 'centroide', pie: 175,
    nota: 'pendiente de confirmar que sigue abierto; punto = Plaza de Santa María (el centro no está en OSM)',
    espera: (t) => /Santa Mar[ií]a/i.test(t.name ?? '') },
  { id: 'puerta-angeles', nombre: 'Puerta de Los Ángeles', osm: ['node', 9538573190], punto: 'nodo', pie: 180,
    espera: (t) => /[ÁA]ngeles/i.test(t.name ?? '') },
  { id: 'torre', nombre: 'Alcázar y Torre del Homenaje', osm: ['node', 9514512200], punto: 'nodo', pie: 235,
    espera: (t) => /Torre del Homenaje/i.test(t.name ?? '') },
  { id: 'puerta-calvario', nombre: 'Puerta del Calvario', osm: ['node', 10000118795], punto: 'nodo', pie: 245,
    espera: (t) => /Calvario/i.test(t.name ?? '') },
  { id: 'museo', nombre: 'Museo Etnográfico Extremeño «González Santana»', osm: ['node', 6966427582], punto: 'nodo', pie: 295,
    espera: (t) => /Etnogr|Gonz[aá]lez Santana/i.test(t.name ?? '') },
  { id: 'plaza-espana', nombre: 'Plaza de España', osm: ['way', 146400721], punto: 'centroide', pie: 365,
    espera: (t) => /Plaza de Espa[ñn]a/i.test(t.name ?? '') },
];

const METODO =
  'rumbo = azimut inicial esférico desde el origen (grados desde el norte, sentido horario); ' +
  'recta = haversine; punto = nodo OSM, centroide de los nodos de la vía o, en la calle Moreno Nieto, su extremo más cercano a la casa; ' +
  `distancias a pie OSRM (routing.openstreetmap.de, perfil foot) ${FECHA_CONTEXTO}; minutos = ceil(m/80); anillo 1/3/5 = ≤1 min / ≤3 min / resto`;

// ---------- geometría ----------
const rad = (g) => (g * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export function rumbo(a, b) {
  const φ1 = rad(a.lat), φ2 = rad(b.lat), Δλ = rad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function haversine(a, b) {
  const φ1 = rad(a.lat), φ2 = rad(b.lat);
  const Δφ = φ2 - φ1, Δλ = rad(b.lon - a.lon);
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R_TIERRA * Math.asin(Math.sqrt(h));
}

const r6 = (x) => Number(x.toFixed(6));
const r1 = (x) => Number(x.toFixed(1));
const minutosDe = (m) => Math.ceil(m / 80);
const anilloDe = (min) => (min <= 1 ? 1 : min <= 3 ? 3 : 5);

// Se calcula siempre con las coordenadas ya redondeadas a 6 decimales (las que se guardan),
// para que --sin-red reproduzca exactamente el mismo resultado.
function completar(l, origen) {
  const p = { lat: r6(l.lat), lon: r6(l.lon) };
  const minutos = minutosDe(l.pie_m);
  return {
    ...l,
    lat: p.lat,
    lon: p.lon,
    rumbo: r1(rumbo(origen, p)),
    recta_m: Math.round(haversine(origen, p)),
    minutos,
    anillo: anilloDe(minutos),
  };
}

const ordenar = (lista) =>
  lista.map((l, i) => [l, i]).sort((a, b) => a[0].pie_m - b[0].pie_m || a[1] - b[1]).map(([l]) => l);

// orden fijo de claves para que el JSON sea legible y estable
function formatear(l) {
  const o = {
    id: l.id, nombre: l.nombre, lat: l.lat, lon: l.lon, rumbo: l.rumbo, recta_m: l.recta_m,
    pie_m: l.pie_m, pie_osrm_m: l.pie_osrm_m ?? null, minutos: l.minutos, anillo: l.anillo,
  };
  if (l.pie_aviso) o.pie_aviso = l.pie_aviso;
  if (l.nota) o.nota = l.nota;
  o.fuente = l.fuente;
  return o;
}

// ---------- red ----------
async function pedir(url, opciones = {}, ms = 60000) {
  const res = await fetch(url, { ...opciones, headers: { 'User-Agent': UA, ...(opciones.headers ?? {}) }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ← ${url}`);
  return res.json();
}

async function elementosOverpass() {
  const ways = LUGARES.filter((l) => l.osm[0] === 'way').map((l) => l.osm[1]);
  const nodes = LUGARES.filter((l) => l.osm[0] === 'node').map((l) => l.osm[1]);
  const q = `[out:json][timeout:60];(way(id:${ways.join(',')});node(id:${nodes.join(',')}););out body;>;out skel qt;`;
  for (const ep of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const d = await pedir(ep, { method: 'POST', body: new URLSearchParams({ data: q }) }, 90000);
      console.log(`Overpass OK: ${ep} (base ${d.osm3s?.timestamp_osm_base ?? '?'})`);
      return d.elements;
    } catch (e) {
      console.warn(`Overpass falló (${ep}): ${e.message}`);
    }
  }
  console.log('Probando la API de OSM elemento a elemento…');
  const out = [];
  for (const { osm: [tipo, id] } of LUGARES) {
    const url = tipo === 'way'
      ? `https://www.openstreetmap.org/api/0.6/way/${id}/full.json`
      : `https://www.openstreetmap.org/api/0.6/node/${id}.json`;
    out.push(...(await pedir(url)).elements);
  }
  return out;
}

async function osrmPie(a, b) {
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const d = await pedir(url, {}, 30000);
  if (d.code !== 'Ok' || !d.routes?.length) throw new Error(`OSRM: ${d.code}`);
  return d.routes[0].distance;
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function conRed() {
  const elementos = await elementosOverpass();
  const nodos = new Map(elementos.filter((e) => e.type === 'node').map((e) => [e.id, e]));
  const buscar = (tipo, id) => elementos.find((e) => e.type === tipo && e.id === id && e.tags) ?? elementos.find((e) => e.type === tipo && e.id === id);

  const fallos = [];
  const lista = [];
  for (const l of LUGARES) {
    const [tipo, id] = l.osm;
    const el = buscar(tipo, id);
    if (!el) { fallos.push(`${tipo}/${id} (${l.id}): no existe`); continue; }
    const tags = el.tags ?? {};
    if (!l.espera(tags)) fallos.push(`${tipo}/${id} (${l.id}): etiquetas inesperadas ${JSON.stringify(tags)}`);

    let p, detalle;
    if (tipo === 'node') {
      p = { lat: el.lat, lon: el.lon };
      detalle = 'nodo';
    } else {
      const ids = [...new Set(el.nodes)];
      const pts = ids.map((n) => nodos.get(n)).filter(Boolean);
      if (pts.length !== ids.length) { fallos.push(`${tipo}/${id}: faltan nodos de la vía`); continue; }
      if (l.punto === 'extremo') {
        const extremos = [el.nodes[0], el.nodes.at(-1)].map((n) => nodos.get(n));
        const [cerca] = extremos.sort((a, b) => haversine(ORIGEN, a) - haversine(ORIGEN, b));
        p = { lat: cerca.lat, lon: cerca.lon };
        detalle = `extremo de la vía más cercano a la casa: node/${cerca.id}`;
      } else {
        p = { lat: pts.reduce((s, n) => s + n.lat, 0) / pts.length, lon: pts.reduce((s, n) => s + n.lon, 0) / pts.length };
        detalle = `centroide de los ${pts.length} nodos de la vía`;
      }
    }
    console.log(`${l.id.padEnd(16)} ${tipo}/${id}  «${tags.name ?? '—'}»  ${detalle}`);

    let pieOsrm = null;
    try {
      pieOsrm = Math.round(await osrmPie(ORIGEN, p));
      await pausa(1100);
    } catch (e) {
      console.warn(`  OSRM falló para ${l.id}: ${e.message}`);
    }
    const lugar = {
      id: l.id, nombre: l.nombre, lat: p.lat, lon: p.lon,
      pie_m: l.pie, pie_osrm_m: pieOsrm, nota: l.nota,
      fuente: { osm: `${tipo}/${id}`, url: `https://www.openstreetmap.org/${tipo}/${id}`, punto: detalle, fecha: HOY },
    };
    if (pieOsrm != null && Math.abs(pieOsrm - l.pie) / l.pie > 0.15) {
      lugar.pie_aviso = `OSRM ${HOY}: ${pieOsrm} m frente a ${l.pie} m de CONTEXTO (${Math.round(((pieOsrm - l.pie) / l.pie) * 100)} %); se usa CONTEXTO`;
    }
    lista.push(lugar);
  }

  if (fallos.length) {
    console.error('\nNo escribo nada; revisa estos elementos:\n  ' + fallos.join('\n  '));
    process.exit(1);
  }
  return { origen: ORIGEN, metodo: METODO, lugares: lista };
}

async function sinRed() {
  const d = JSON.parse(await readFile(SALIDA, 'utf8'));
  return { origen: d.origen, metodo: d.metodo ?? METODO, lugares: d.lugares };
}

// ---------- main ----------
const datos = process.argv.includes('--sin-red') ? await sinRed() : await conRed();
const origen = { lat: r6(datos.origen.lat), lon: r6(datos.origen.lon) };
const salida = {
  origen: { ...datos.origen, lat: r6(datos.origen.lat), lon: r6(datos.origen.lon) },
  metodo: datos.metodo,
  lugares: ordenar(datos.lugares.map((l) => completar(l, origen))).map(formatear),
};

await mkdir(dirname(SALIDA), { recursive: true });
await writeFile(SALIDA, JSON.stringify(salida, null, 2) + '\n', 'utf8');

console.log(`\n${'lugar'.padEnd(16)} rumbo  recta  pie  osrm  min anillo`);
for (const l of salida.lugares) {
  console.log(`${l.id.padEnd(16)} ${String(l.rumbo).padStart(5)}  ${String(l.recta_m).padStart(4)}  ${String(l.pie_m).padStart(4)}  ${String(l.pie_osrm_m ?? '—').padStart(4)}  ${String(l.minutos).padStart(3)}  ${l.anillo}`);
}
console.log(`\nEscrito ${SALIDA}`);
