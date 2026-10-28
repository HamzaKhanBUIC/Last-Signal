import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
// Loopback only: the dev server must not be reachable from the local network.
const HOST = '127.0.0.1';

// Only what the game loads in the browser is served; .git, node_modules,
// tests, docs and other repo files stay private.
const PUBLIC_FILES = new Set(['/index.html', '/style.css']);
const PUBLIC_DIRS = ['/src/', '/assets/'];

export function resolveStaticPath(requestUrl, rootDir = __dirname) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(String(requestUrl || '/').split('?')[0]);
  } catch {
    return null;
  }
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  if (urlPath.includes('\0') || urlPath.includes('\\')) return null;

  const normalized = path.posix.normalize(urlPath);
  if (!PUBLIC_FILES.has(normalized) && !PUBLIC_DIRS.some((dir) => normalized.startsWith(dir))) return null;
  if (normalized.split('/').some((segment) => segment.startsWith('.'))) return null;

  const root = path.resolve(rootDir);
  const filePath = path.resolve(root, '.' + normalized);
  return filePath.startsWith(root + path.sep) ? filePath : null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  const filePath = resolveStaticPath(req.url);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// Listen only when run directly (`npm run serve`), not when tests import resolveStaticPath.
let isMain = false;
try {
  isMain = fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(__filename);
} catch {
  isMain = false;
}

if (isMain) server.listen(PORT, HOST, () => {
  console.log(`\n==================================================`);
  console.log(`  THE LAST SIGNAL — LOCAL SERVER LIVE!             `);
  console.log(`  URL: http://${HOST}:${PORT}                 `);
  console.log(`==================================================\n`);
});
