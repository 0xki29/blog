/* Tiny static server for production-accurate local preview.
   Serves C:\Users\VIETLONGVNN\Documents so absolute /blog/... paths match production.
   Start: node tools/preview-server.js   (port 8123)   Stop: kill node process */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/VIETLONGVNN/Documents';
const PORT = 8123;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json'
};

http.createServer(function (req, res) {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { p = '/'; }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.normalize(path.join(ROOT, p));
  if (!f.startsWith(path.normalize(ROOT)) || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, function () {
  console.log('preview server on http://localhost:' + PORT + '/blog/drafts/preview.html');
});
