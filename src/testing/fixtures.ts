import { Game, applyAction, createGame } from '../game';

export function gameInProgress(): Game {
  let game = createGame(['Ada', 'Grace', 'Alan']);
  const [ada, grace, alan] = game.players;

  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 12 });
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 9 });
  game = applyAction(game, { type: 'toggleModifier', playerId: ada.id, modifier: '+4' });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 5 });
  game = applyAction(game, { type: 'toggleBusted', playerId: grace.id });
  game = applyAction(game, { type: 'endRound' });

  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 1 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 2 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 3 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 4 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 5 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 6 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 7 });
  game = applyAction(game, { type: 'toggleModifier', playerId: grace.id, modifier: 'x2' });
  game = applyAction(game, { type: 'toggleNumber', playerId: alan.id, value: 8 });

  return game;
}

export function finishedGame(): Game {
  let game = createGame(['Ada', 'Grace'], 20);
  const [ada, grace] = game.players;

  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 12 });
  game = applyAction(game, { type: 'toggleNumber', playerId: ada.id, value: 11 });
  game = applyAction(game, { type: 'toggleNumber', playerId: grace.id, value: 6 });
  game = applyAction(game, { type: 'endRound' });

  return game;
}
