import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { Scoreboard } from './Scoreboard.tsx';
import { assertSnapshot } from '../testing/snapshot.ts';
import { finishedGame, gameInProgress } from '../testing/fixtures.ts';
import { Game } from '../game.ts';

const testFilePath = fileURLToPath(import.meta.url);

async function render(game: Game): Promise<string> {
  const html = renderToStaticMarkup(React.createElement(Scoreboard, { game }));
  return format(html, { parser: 'html' });
}

test('Scoreboard renders totals and the live round score', async (t) => {
  await assertSnapshot(t, await render(gameInProgress()), { testFilePath, extension: '.html' });
});

test('Scoreboard renders a finished game without a round column', async (t) => {
  await assertSnapshot(t, await render(finishedGame()), { testFilePath, extension: '.html' });
});
