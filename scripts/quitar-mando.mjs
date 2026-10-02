/* Genera la copia que viaja al cliente, SIN el mando de maqueta.
   No toca esta carpeta: escribe una copia limpia en otra, para que la maqueta
   con sus dos versiones y sus tres paletas siga sirviendo para la reunión.

   node scripts/quitar-mando.mjs ../casa-juderia-entrega
   node scripts/comprobar-borrado.mjs ../casa-juderia-entrega

   Entrega la versión «Roseta» (la cargada) con la paleta real. Si Javier elige
   la sobria u otro color, ver README → «Quitar el mando de maqueta», casos B y C.

   Qué quita, siempre por marcas «[MANDO DE MAQUETA] … fin del bloque [MANDO DE MAQUETA]»:
     index.html        aviso del mando, lectura de densidad y paleta en el <head>,
                       la comparativa (solo existe en la sobria) y el <div class="mando">
     css/estilos.css   las paletas alternativas, las reglas de la sobria y el mando
     js/main.js        mandoMaqueta()
     privacidad.html   la fila de las claves cdlj-densidad y cdlj-paleta
   Después vuelve a versionar CSS y JS (?v=), porque han cambiado.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destino = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!destino) { console.error('Uso: node scripts/quitar-mando.mjs <carpeta-destino>'); process.exit(1); }
if (destino === raiz || destino.startsWith(raiz + path.sep)) { console.error('El destino tiene que estar fuera de la maqueta.'); process.exit(1); }

const fuera = new Set(['scripts', 'screenshots', 'node_modules', '.git']);
function copiar(de, a) {
  fs.mkdirSync(a, { recursive: true });
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    if (fuera.has(e.name)) continue;
    const o = path.join(de, e.name), d = path.join(a, e.name);
    if (e.isDirectory()) copiar(o, d); else fs.copyFileSync(o, d);
  }
}
fs.rmSync(destino, { recursive: true, force: true });
copiar(raiz, destino);

/* bloques: HTML con ═══ … ═══ y código con comentario de apertura y de cierre */
const bloqueHtml = /[ \t]*<!-- ═+ \[MANDO DE MAQUETA\][\s\S]*?fin del bloque \[MANDO DE MAQUETA\] ═+ -->\r?\n?/g;
const bloqueCodigo = /[ \t]*\/\*[^*]*?\[MANDO DE MAQUETA\][\s\S]*?fin del bloque \[MANDO DE MAQUETA\][^*]*\*\/\r?\n?/g;
const filaPrivacidad = /[ \t]*<!-- \[MANDO DE MAQUETA\][^>]*-->\s*<tr>[\s\S]*?<\/tr>\r?\n?/g;
/* el bloque de CSS que empieza con «═══ [MANDO DE MAQUETA] paletas …» se cierra en su propio
   comentario: las dos reglas de paleta van justo detrás y se quitan aparte, ancladas */
const reglasPaleta = /html\.paleta-azul \{[^}]*\}\r?\nhtml\.paleta-oliva \{[^}]*\}\r?\n/;

const cambios = {
  'index.html': t => t.replace(bloqueHtml, '').replace(bloqueCodigo, '').replace(/ paleta-real/, ''),
  'css/estilos.css': t => t.replace(bloqueCodigo, '').replace(reglasPaleta, ''),
  'js/main.js': t => t.replace(bloqueCodigo, ''),
  'privacidad.html': t => t.replace(filaPrivacidad, '')
};
for (const [archivo, f] of Object.entries(cambios)) {
  const ruta = path.join(destino, archivo);
  const antes = fs.readFileSync(ruta, 'utf8');
  const despues = f(antes);
  /* nada de comodines que se coman el archivo: si pierde más de un tercio, algo va mal */
  if (despues.length < antes.length * 0.66) { console.error('Me niego: ' + archivo + ' perdería demasiado.'); process.exit(1); }
  fs.writeFileSync(ruta, despues);
  console.log((antes === despues ? 'sin cambios ' : 'limpiado    ') + archivo + '  (−' + (antes.length - despues.length) + ' caracteres)');
}
execFileSync(process.execPath, [path.join(raiz, 'scripts/versionar.mjs'), destino], { stdio: 'ignore' });
console.log('Copia sin mando en ' + destino);
