import { test } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { StorageNotice } from './StorageNotice.tsx';
import { assertSnapshot } from '../testing/snapshot.ts';

const testFilePath = fileURLToPath(import.meta.url);

async function render(persistent: boolean, error: string | null): Promise<string> {
  const html = renderToStaticMarkup(React.createElement(StorageNotice, { persistent, error }));
  return format(html, { parser: 'html' });
}

test('StorageNotice renders nothing when the database is working', async () => {
  const html = renderToStaticMarkup(
    React.createElement(StorageNotice, { persistent: true, error: null })
  );
  assert.strictEqual(html, '');
});

test('StorageNotice warns when IndexedDB is unavailable', async (t) => {
  await assertSnapshot(t, await render(false, null), { testFilePath, extension: '.html' });
});

test('StorageNotice reports a database error ahead of the unavailable warning', async (t) => {
  await assertSnapshot(t, await render(false, 'QuotaExceededError'), {
    testFilePath,
    extension: '.html',
  });
});
