/* Servidor estático para revisar la web en el navegador.
   La web se abre también con doble clic; esto es para probarla como en
   GitHub Pages (y para verificar.mjs).

   node scripts/servir.mjs          → http://127.0.0.1:4197
   node scripts/servir.mjs 5000     → otro puerto
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puerto = Number(process.argv[2]) || 4197;
export const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.md': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  const limpia = decodeURIComponent(req.url.split('?')[0]);
  const destino = path.join(raiz, limpia === '/' ? 'index.html' : limpia);
  if (!destino.startsWith(raiz)) { res.writeHead(403).end('no'); return; }
  if (!fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(path.join(raiz, '404.html')) ? fs.readFileSync(path.join(raiz, '404.html')) : 'no está');
    return;
  }
  res.writeHead(200, { 'content-type': tipos[path.extname(destino)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(destino));
}).listen(puerto, '127.0.0.1', () => {
  console.log('Casa de la Judería en http://127.0.0.1:' + puerto);
  console.log('Ctrl+C para parar.');
});
