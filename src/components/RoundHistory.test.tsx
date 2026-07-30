import { test } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { RoundHistory } from './RoundHistory.tsx';
import { assertSnapshot } from '../testing/snapshot.ts';
import { gameInProgress } from '../testing/fixtures.ts';
import { createGame } from '../game.ts';

const testFilePath = fileURLToPath(import.meta.url);

test('RoundHistory renders a row per played round', async (t) => {
  const html = renderToStaticMarkup(React.createElement(RoundHistory, { game: gameInProgress() }));
  await assertSnapshot(t, await format(html, { parser: 'html' }), {
    testFilePath,
    extension: '.html',
  });
});

test('RoundHistory renders nothing before the first round is played', () => {
  const html = renderToStaticMarkup(
    React.createElement(RoundHistory, { game: createGame(['Ada']) })
  );
  assert.strictEqual(html, '');
});
