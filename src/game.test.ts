import { test } from 'node:test';
import assert from 'node:assert';
import {
  FLIP_7_BONUS,
  Game,
  Hand,
  Modifier,
  applyAction,
  createGame,
  emptyHand,
  hasFlip7,
  isGameOver,
  isTyped,
  scoreHand,
  scoreRound,
  standings,
  totals,
  winners,
} from './game';

function hand(numbers: number[], modifiers: Modifier[] = [], busted = false): Hand {
  return { numbers, modifiers, busted };
}

test('scoreHand sums number cards', () => {
  assert.strictEqual(scoreHand(hand([3, 7, 11])), 21);
});

test('scoreHand scores an empty hand as zero', () => {
  assert.strictEqual(scoreHand(emptyHand()), 0);
});

test('scoreHand scores a busted hand as zero even with modifiers', () => {
  assert.strictEqual(scoreHand(hand([12, 11, 10], ['x2', '+10'], true)), 0);
});

test('scoreHand doubles number cards before adding plus modifiers', () => {
  assert.strictEqual(scoreHand(hand([5, 6], ['x2', '+4'])), 26);
});

test('scoreHand adds plus modifiers without x2', () => {
  assert.strictEqual(scoreHand(hand([5, 6], ['+4', '+10'])), 25);
});

test('scoreHand awards the Flip 7 bonus for seven number cards', () => {
  const seven = hand([0, 1, 2, 3, 4, 5, 6]);
  assert.strictEqual(hasFlip7(seven), true);
  assert.strictEqual(scoreHand(seven), 21 + FLIP_7_BONUS);
});

test('scoreHand applies x2 to the number cards but not to the Flip 7 bonus', () => {
  assert.strictEqual(scoreHand(hand([1, 2, 3, 4, 5, 6, 7], ['x2'])), 56 + FLIP_7_BONUS);
});

test('hasFlip7 is false for a busted hand', () => {
  assert.strictEqual(hasFlip7(hand([1, 2, 3, 4, 5, 6, 7], [], true)), false);
});

test('scoreHand returns a typed score verbatim', () => {
  assert.strictEqual(scoreHand({ numbers: [], modifiers: [], busted: false, points: 37 }), 37);
});

test('scoreHand treats a typed zero as a real score, not as absent', () => {
  assert.strictEqual(scoreHand({ numbers: [], modifiers: [], busted: false, points: 0 }), 0);
  assert.strictEqual(isTyped({ numbers: [], modifiers: [], busted: false, points: 0 }), true);
});

test('scoreHand falls back to the cards when nothing was typed', () => {
  assert.strictEqual(scoreHand({ numbers: [4, 8], modifiers: ['+2'], busted: false }), 14);
  assert.strictEqual(isTyped({ numbers: [4, 8], modifiers: ['+2'], busted: false }), false);
});

test('a typed score never collects the Flip 7 bonus on its own', () => {
  const typed = { numbers: [], modifiers: [], busted: false, points: 21 };
  assert.strictEqual(hasFlip7(typed), false);
  assert.strictEqual(scoreHand(typed), 21);
});

test('a busted hand scores zero even with a typed score', () => {
  assert.strictEqual(scoreHand({ numbers: [], modifiers: [], busted: true, points: 99 }), 0);
});

test('setPoints replaces any cards so the row cannot show a stale breakdown', () => {
  let game = createGame(['Ada']);
  const playerId = game.players[0].id;
  game = applyAction(game, { type: 'toggleNumber', playerId, value: 9 });
  game = applyAction(game, { type: 'toggleModifier', playerId, modifier: 'x2' });
  game = applyAction(game, { type: 'setPoints', playerId, points: 42 });

  const hand = game.current?.hands[playerId];
  assert.deepStrictEqual(hand?.numbers, []);
  assert.deepStrictEqual(hand?.modifiers, []);
  assert.strictEqual(scoreHand(hand as Hand), 42);
});

test('tapping a card clears a typed score', () => {
  let game = createGame(['Ada']);
  const playerId = game.players[0].id;
  game = applyAction(game, { type: 'setPoints', playerId, points: 42 });
  game = applyAction(game, { type: 'toggleNumber', playerId, value: 5 });

  const hand = game.current?.hands[playerId] as Hand;
  assert.strictEqual(isTyped(hand), false);
  assert.strictEqual(scoreHand(hand), 5);
});

test('tapping a modifier clears a typed score', () => {
  let game = createGame(['Ada']);
  const playerId = game.players[0].id;
  game = applyAction(game, { type: 'setPoints', playerId, points: 42 });
  game = applyAction(game, { type: 'toggleModifier', playerId, modifier: '+6' });

  const hand = game.current?.hands[playerId] as Hand;
  assert.strictEqual(isTyped(hand), false);
  assert.strictEqual(scoreHand(hand), 6);
});

test('bust survives a typed score and restores it when cleared', () => {
  let game = createGame(['Ada']);
  const playerId = game.players[0].id;
  game = applyAction(game, { type: 'setPoints', playerId, points: 30 });
  game = applyAction(game, { type: 'toggleBusted', playerId });
  assert.strictEqual(scoreHand(game.current?.hands[playerId] as Hand), 0);

  game = applyAction(game, { type: 'toggleBusted', playerId });
  assert.strictEqual(scoreHand(game.current?.hands[playerId] as Hand), 30);
});

test('clearHand drops a typed score', () => {
  let game = createGame(['Ada']);
  const playerId = game.players[0].id;
  game = applyAction(game, { type: 'setPoints', playerId, points: 30 });
  game = applyAction(game, { type: 'clearHand', playerId });
  assert.deepStrictEqual(game.current?.hands[playerId], emptyHand());
});

test('typed scores accumulate into totals and win the game', () => {
  let game = createGame(['Ada', 'Grace'], 50);
  const [ada, grace] = game.players;
  game = applyAction(game, { type: 'setPoints', playerId: ada.id, points: 30 });
  game = applyAction(game, { type: 'setPoints', playerId: grace.id, points: 12 });
  game = applyAction(game, { type: 'endRound' });
  game = applyAction(game, { type: 'setPoints', playerId: ada.id, points: 25 });
  game = applyAction(game, { type: 'endRound' });

  assert.deepStrictEqual(totals(game), { [ada.id]: 55, [grace.id]: 12 });
  assert.deepStrictEqual(
    winners(game).map((player) => player.name),
    ['Ada']
  );
});

test('a hand saved before typed scores existed still scores from its cards', () => {
  const legacy = { numbers: [10, 11], modifiers: ['x2'] as Modifier[], busted: false };
  assert.strictEqual(isTyped(legacy), false);
  assert.strictEqual(scoreHand(legacy), 42);
});

test('createGame names unnamed players and starts an empty first round', () => {
  const game = createGame(['Ada', '  ', 'Grace']);
  assert.deepStrictEqual(
    game.players.map((player) => player.name),
    ['Ada', 'Player 2', 'Grace']
  );
  assert.strictEqual(game.rounds.length, 0);
  assert.notStrictEqual(game.current, null);
  assert.deepStrictEqual(game.current?.hands[game.players[0].id], emptyHand());
});

test('toggleNumber adds then removes a card and keeps cards sorted', () => {
  let game = createGame(['Ada']);
  const playerId = game.players[0].id;
  game = applyAction(game, { type: 'toggleNumber', playerId, value: 9 });
  game = applyAction(game, { type: 'toggleNumber', playerId, value: 4 });
  assert.deepStrictEqual(game.current?.hands[playerId].numbers, [4, 9]);

  game = applyAction(game, { type: 'toggleNumber', playerId, value: 9 });
  assert.deepStrictEqual(game.current?.hands[playerId].numbers, [4]);
});

test('toggleModifier keeps modifiers in a stable display order', () => {
  let game = createGame(['Ada']);
  const playerId = game.players[0].id;
  game = applyAction(game, { type: 'toggleModifier', playerId, modifier: '+10' });
  game = applyAction(game, { type: 'toggleModifier', playerId, modifier: 'x2' });
  game = applyAction(game, { type: 'toggleModifier', playerId, modifier: '+2' });
  assert.deepStrictEqual(game.current?.hands[playerId].modifiers, ['x2', '+2', '+10']);
});

test('toggleBusted and clearHand edit only the given player', () => {
  let game = createGame(['Ada', 'Grace']);
  const [ada, grace] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 5 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 8 });
  game = applyAction(game, { type: 'toggleBusted', playerId: ada.id });

  assert.strictEqual(game.current?.hands[ada.id].busted, true);
  assert.strictEqual(game.current?.hands[grace.id].busted, false);

  game = applyAction(game, { type: 'clearHand', playerId: ada.id });
  assert.deepStrictEqual(game.current?.hands[ada.id], emptyHand());
  assert.deepStrictEqual(game.current?.hands[grace.id].numbers, [8]);
});

test('endRound commits the round and opens the next one', () => {
  let game = createGame(['Ada', 'Grace']);
  const [ada] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 12 });
  game = applyAction(game, { type: 'endRound' });

  assert.strictEqual(game.rounds.length, 1);
  assert.deepStrictEqual(game.rounds[0].hands[ada.id].numbers, [12]);
  assert.deepStrictEqual(game.current?.hands[ada.id], emptyHand());
  assert.strictEqual(isGameOver(game), false);
});

test('endRound closes the game once a player reaches the target score', () => {
  let game = createGame(['Ada', 'Grace'], 20);
  const [ada, grace] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 12 });
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 8 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 3 });
  game = applyAction(game, { type: 'endRound' });

  assert.strictEqual(game.current, null);
  assert.strictEqual(isGameOver(game), true);
  assert.deepStrictEqual(
    winners(game).map((player) => player.name),
    ['Ada']
  );
});

test('winners reports a tie when the leaders match', () => {
  let game = createGame(['Ada', 'Grace'], 10);
  const [ada, grace] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 11 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 11 });
  game = applyAction(game, { type: 'endRound' });

  assert.deepStrictEqual(
    winners(game).map((player) => player.name),
    ['Ada', 'Grace']
  );
});

test('winners is empty while the game is still running', () => {
  const game = createGame(['Ada']);
  assert.deepStrictEqual(winners(game), []);
});

test('undoRound reopens the previous round for editing', () => {
  let game = createGame(['Ada'], 10);
  const [ada] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 12 });
  game = applyAction(game, { type: 'endRound' });
  assert.strictEqual(game.current, null);

  game = applyAction(game, { type: 'undoRound' });
  assert.strictEqual(game.rounds.length, 0);
  assert.deepStrictEqual(game.current?.hands[ada.id].numbers, [12]);
  assert.strictEqual(isGameOver(game), false);
});

test('undoRound is a no-op when no round has been played', () => {
  const game = createGame(['Ada']);
  assert.strictEqual(applyAction(game, { type: 'undoRound' }), game);
});

test('actions on a finished game are ignored', () => {
  let game = createGame(['Ada'], 5);
  const [ada] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 12 });
  game = applyAction(game, { type: 'endRound' });

  assert.strictEqual(applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 3 }), game);
  assert.strictEqual(applyAction(game, { type: 'endRound' }), game);
});

test('totals accumulate committed rounds only', () => {
  let game = createGame(['Ada', 'Grace']);
  const [ada, grace] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 10 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 4 });
  game = applyAction(game, { type: 'endRound' });
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 7 });

  assert.deepStrictEqual(totals(game), { [ada.id]: 10, [grace.id]: 4 });
});

test('scoreRound scores every player in the round', () => {
  let game = createGame(['Ada', 'Grace']);
  const [ada, grace] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 6 });
  game = applyAction(game, { type: 'toggleModifier', playerId: ada.id, modifier: '+4' });
  game = applyAction(game, { type: 'toggleBusted', playerId: grace.id });

  const scores = scoreRound(game.current as NonNullable<Game['current']>, game.players);
  assert.deepStrictEqual(scores, { [ada.id]: 10, [grace.id]: 0 });
});

test('standings rank players by total and share a rank on ties', () => {
  let game = createGame(['Ada', 'Grace', 'Alan']);
  const [ada, grace, alan] = game.players;
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 5 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 12 });
  game = applyAction(game, { type: 'toggleNumber', playerId: alan.id, value: 5 });
  game = applyAction(game, { type: 'endRound' });

  assert.deepStrictEqual(
    standings(game).map(({ player, total, rank }) => [player.name, total, rank]),
    [
      ['Grace', 12, 1],
      ['Ada', 5, 2],
      ['Alan', 5, 2],
    ]
  );
});
