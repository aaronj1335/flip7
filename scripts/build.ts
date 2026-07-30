import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dirName = path.dirname(fileURLToPath(import.meta.url));

function inject(html: string, marker: string, content: string): string {
  return html.replace(marker, () => content);
}

async function build(): Promise<void> {
  console.error('Building source...');

  const result = await esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    write: false,
    minify: true,
    loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
    platform: 'browser',
    target: 'esnext',
    outdir: 'dist',
  });

  const jsFile = result.outputFiles?.find((file) => file.path.endsWith('.js'));
  const cssFile = result.outputFiles?.find((file) => file.path.endsWith('.css'));
  const js = (jsFile ? jsFile.text : '').replaceAll('</script', '<\\/script');
  const css = cssFile ? cssFile.text : '';

  const templatePath = path.resolve(dirName, '..', 'index.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  console.error('Generating standalone HTML...');

  let html = inject(template, '<link rel="stylesheet" href="./dist/app.css">', '');
  html = inject(html, '<script type="module" src="./dist/app.js"></script>', '');
  html = inject(html, '<!--PRODUCTION_STYLE-->', `<style>${css}</style>`);
  html = inject(html, '<!--PRODUCTION_SCRIPT-->', `<script>${js}</script>`);

  fs.writeSync(process.stdout.fd, html);
}

build().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
