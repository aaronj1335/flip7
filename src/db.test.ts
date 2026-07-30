import { test } from 'node:test';
import assert from 'node:assert';
import { IDBFactory } from 'fake-indexeddb';
import { createGameStore } from './db';
import { applyAction, createGame } from './game';

function freshStore() {
  return createGameStore(new IDBFactory());
}

test('activeGame is null before anything is saved', async () => {
  const store = freshStore();
  assert.strictEqual(await store.activeGame(), null);
});

test('save round-trips a game and marks it active', async () => {
  const store = freshStore();
  let game = createGame(['Ada', 'Grace']);
  const [ada] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 7 });

  await store.save(game);
  const loaded = await store.activeGame();

  assert.deepStrictEqual(loaded, game);
});

test('save keeps the latest version of an in-progress game', async () => {
  const store = freshStore();
  let game = createGame(['Ada']);
  const [ada] = game.players;
  await store.save(game);

  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 11 });
  game = applyAction(game, { type: 'endRound' });
  await store.save(game);

  const loaded = await store.activeGame();
  assert.strictEqual(loaded?.rounds.length, 1);
  assert.deepStrictEqual(loaded?.rounds[0].hands[ada.id].numbers, [11]);
  assert.strictEqual((await store.recentGames()).length, 1);
});

test('recentGames lists saved games newest first', async () => {
  const store = freshStore();
  const older = { ...createGame(['Ada']), id: 'game-older', updatedAt: 1000 };
  const newer = { ...createGame(['Grace']), id: 'game-newer', updatedAt: 2000 };

  await store.save(older);
  await store.save(newer);

  assert.deepStrictEqual(
    (await store.recentGames()).map((game) => game.id),
    ['game-newer', 'game-older']
  );
});

test('recentGames honours the limit', async () => {
  const store = freshStore();
  for (let i = 0; i < 5; i += 1) {
    await store.save({ ...createGame(['Ada']), id: `game-${i}`, updatedAt: i });
  }
  assert.strictEqual((await store.recentGames(2)).length, 2);
});

test('setActiveGame switches and clears the resumed game', async () => {
  const store = freshStore();
  const first = { ...createGame(['Ada']), id: 'game-first' };
  const second = { ...createGame(['Grace']), id: 'game-second' };
  await store.save(first);
  await store.save(second);

  await store.setActiveGame('game-first');
  assert.strictEqual((await store.activeGame())?.id, 'game-first');

  await store.setActiveGame(null);
  assert.strictEqual(await store.activeGame(), null);
  assert.strictEqual((await store.recentGames()).length, 2);
});

test('remove deletes the game and clears it when it is active', async () => {
  const store = freshStore();
  const game = createGame(['Ada']);
  await store.save(game);

  await store.remove(game.id);

  assert.strictEqual(await store.activeGame(), null);
  assert.deepStrictEqual(await store.recentGames(), []);
});

test('a second store reads games written by the first', async () => {
  const factory = new IDBFactory();
  const writer = createGameStore(factory);
  const game = createGame(['Ada', 'Grace']);
  await writer.save(game);

  const reader = createGameStore(factory);
  assert.deepStrictEqual((await reader.activeGame())?.id, game.id);
});
