/* Comprueba contra los archivos que el mando de maqueta ya no está.
   La receta del README no se escribe de memoria: se comprueba.

   node scripts/comprobar-borrado.mjs ../casa-juderia-entrega
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizMaqueta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raiz = process.argv[2] ? path.resolve(process.argv[2]) : raizMaqueta;

const rastros = [
  ['index.html',       /\[MANDO DE MAQUETA\]/,      'marcas [MANDO DE MAQUETA]'],
  ['index.html',       /id="mando"/,                'el <div class="mando">'],
  ['index.html',       /cdlj-densidad|cdlj-paleta/, 'la lectura de densidad y paleta en el <head>'],
  ['index.html',       /id="comparativa"/,          'la comparativa (solo existe para la sobria)'],
  ['index.html',       /revision/,                  'cualquier mención al modo ?revision'],
  ['css/estilos.css',  /\[MANDO DE MAQUETA\]/,      'los bloques CSS del mando'],
  ['css/estilos.css',  /densidad-sobria/,           'las reglas de la versión sobria'],
  ['css/estilos.css',  /paleta-(azul|oliva)/,       'las paletas alternativas'],
  ['css/estilos.css',  /\.mando/,                   'los estilos del mando'],
  ['js/main.js',       /\[MANDO DE MAQUETA\]/,      'el bloque JS del mando'],
  ['js/main.js',       /mandoMaqueta/,              'la función mandoMaqueta()'],
  ['js/main.js',       /cdlj-densidad|cdlj-paleta/, 'las claves guardadas'],
  ['privacidad.html',  /cdlj-densidad|cdlj-paleta/, 'la fila del aviso de almacenamiento'],
  ['privacidad.html',  /\[MANDO DE MAQUETA\]/,      'el comentario de la fila']
];
/* y lo que NO debe perderse al borrar */
const imprescindibles = [
  ['index.html', /id="cortina"/, 'la cortina'],
  ['index.html', /id="elegidor"/, 'el elegidor'],
  ['index.html', /class="diagrama__svg"/, 'el diagrama'],
  ['index.html', /id="cookies"/, 'el aviso de cookies'],
  ['css/estilos.css', /\.cortina__panel/, 'los estilos de la cortina'],
  ['css/estilos.css', /\.friso__diente/, 'el friso'],
  ['js/main.js', /function correrCortina/, 'la cortina en JS'],
  ['js/main.js', /CLAVE_COOKIES/, 'el aviso de cookies en JS']
];

let quedan = 0, faltan = 0;
console.log('Rastros del mando de maqueta en ' + raiz);
console.log('-'.repeat(76));
for (const [archivo, patron, que] of rastros) {
  const hay = patron.test(fs.readFileSync(path.join(raiz, archivo), 'utf8'));
  if (hay) quedan++;
  console.log((hay ? 'QUEDA ' : 'limpio') + '  ' + archivo.padEnd(18) + que);
}
for (const [archivo, patron, que] of imprescindibles) {
  const hay = patron.test(fs.readFileSync(path.join(raiz, archivo), 'utf8'));
  if (!hay) faltan++;
  console.log((hay ? 'sigue ' : 'FALTA ') + '  ' + archivo.padEnd(18) + que);
}
console.log('-'.repeat(76));
if (raiz === raizMaqueta) console.log('(Esta es la maqueta: aquí el mando TIENE que estar; pásale la carpeta de la entrega.)');
else if (quedan || faltan) { console.log(quedan + ' rastro(s), ' + faltan + ' pieza(s) perdida(s). No entregar todavía.'); process.exitCode = 1; }
else console.log('Sin rastros del mando y sin piezas perdidas. Se puede entregar.');
