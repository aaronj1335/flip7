import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dirName = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const ROOT_DIR = path.resolve(dirName, '..');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

async function start(): Promise<void> {
  const clients: http.ServerResponse[] = [];

  const ctx = await esbuild.context({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    outfile: 'dist/app.js',
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
    platform: 'browser',
    sourcemap: true,
    plugins: [
      {
        name: 'reload-plugin',
        setup(build) {
          build.onEnd(() => {
            console.log('Build ended, reloading...');
            clients.forEach((res) => res.write('data: update\n\n'));
          });
        },
      },
    ],
  });

  await ctx.watch();

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url ?? '', `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/esbuild') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      clients.push(res);
      return;
    }

    let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, pathname);
    }

    const ext = path.extname(filePath);

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
      if (ext === '.html') {
        res.end(
          content +
            '<script>new EventSource("/esbuild").onmessage = () => location.reload()</script>'
        );
      } else {
        res.end(content);
      }
    });
  });

  server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
}

start();
