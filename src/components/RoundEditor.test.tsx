import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { format } from 'prettier';
import { RoundEditor } from './RoundEditor.tsx';
import { assertSnapshot } from '../testing/snapshot.ts';
import { gameInProgress } from '../testing/fixtures.ts';
import { Round } from '../game.ts';

const testFilePath = fileURLToPath(import.meta.url);

async function render(expandedPlayerId: string | null): Promise<string> {
  const game = gameInProgress();
  const html = renderToStaticMarkup(
    React.createElement(RoundEditor, {
      players: game.players,
      round: game.current as Round,
      roundNumber: game.rounds.length + 1,
      expandedPlayerId,
      onExpandPlayer: () => {},
      onAction: () => {},
      canUndo: true,
    })
  );
  return format(html, { parser: 'html' });
}

test('RoundEditor renders collapsed hand summaries', async (t) => {
  await assertSnapshot(t, await render(null), { testFilePath, extension: '.html' });
});

test('RoundEditor renders the card picker for the expanded player', async (t) => {
  await assertSnapshot(t, await render('p2'), { testFilePath, extension: '.html' });
});
