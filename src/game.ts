export const TARGET_SCORE = 200;
export const FLIP_7_BONUS = 15;
export const FLIP_7_SIZE = 7;
export const NUMBER_CARDS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const MODIFIER_CARDS: readonly Modifier[] = ['x2', '+2', '+4', '+6', '+8', '+10'];

export type Modifier = 'x2' | '+2' | '+4' | '+6' | '+8' | '+10';

export interface Player {
  id: string;
  name: string;
}

export interface Hand {
  numbers: number[];
  modifiers: Modifier[];
  busted: boolean;
  points?: number | null;
}

export interface Round {
  hands: Record<string, Hand>;
}

export interface Game {
  id: string;
  players: Player[];
  rounds: Round[];
  current: Round | null;
  targetScore: number;
  createdAt: number;
  updatedAt: number;
}

export type GameAction =
  | { type: 'setPoints'; playerId: string; points: number }
  | { type: 'toggleNumber'; playerId: string; value: number }
  | { type: 'toggleModifier'; playerId: string; modifier: Modifier }
  | { type: 'toggleBusted'; playerId: string }
  | { type: 'clearHand'; playerId: string }
  | { type: 'endRound' }
  | { type: 'undoRound' };

export function emptyHand(): Hand {
  return { numbers: [], modifiers: [], busted: false, points: null };
}

export function emptyRound(players: readonly Player[]): Round {
  const hands: Record<string, Hand> = {};
  for (const player of players) {
    hands[player.id] = emptyHand();
  }
  return { hands };
}

export function handOf(round: Round, playerId: string): Hand {
  return round.hands[playerId] ?? emptyHand();
}

export function typedPoints(hand: Hand): number | null {
  return hand.points ?? null;
}

export function isTyped(hand: Hand): boolean {
  return typedPoints(hand) !== null;
}

export function isHandEmpty(hand: Hand): boolean {
  return (
    !hand.busted && !isTyped(hand) && hand.numbers.length === 0 && hand.modifiers.length === 0
  );
}

export function hasFlip7(hand: Hand): boolean {
  return !hand.busted && !isTyped(hand) && hand.numbers.length >= FLIP_7_SIZE;
}

export function scoreCards(hand: Hand): number {
  const numberTotal = hand.numbers.reduce((total, value) => total + value, 0);
  const doubled = hand.modifiers.includes('x2') ? numberTotal * 2 : numberTotal;
  const added = hand.modifiers.reduce(
    (total, modifier) => (modifier === 'x2' ? total : total + Number(modifier.slice(1))),
    0
  );
  return doubled + added + (hasFlip7(hand) ? FLIP_7_BONUS : 0);
}

export function scoreHand(hand: Hand): number {
  if (hand.busted) {
    return 0;
  }
  return typedPoints(hand) ?? scoreCards(hand);
}

export function scoreRound(round: Round, players: readonly Player[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const player of players) {
    scores[player.id] = scoreHand(handOf(round, player.id));
  }
  return scores;
}

export function totals(game: Game): Record<string, number> {
  const result: Record<string, number> = {};
  for (const player of game.players) {
    result[player.id] = 0;
  }
  for (const round of game.rounds) {
    for (const player of game.players) {
      result[player.id] += scoreHand(handOf(round, player.id));
    }
  }
  return result;
}

export function isGameOver(game: Game): boolean {
  return Object.values(totals(game)).some((total) => total >= game.targetScore);
}

export function winners(game: Game): Player[] {
  if (!isGameOver(game)) {
    return [];
  }
  const scores = totals(game);
  const best = Math.max(...game.players.map((player) => scores[player.id]));
  return game.players.filter((player) => scores[player.id] === best);
}

export function standings(game: Game): { player: Player; total: number; rank: number }[] {
  const scores = totals(game);
  const sorted = [...game.players].sort((a, b) => scores[b.id] - scores[a.id]);
  let rank = 0;
  let previous: number | null = null;
  return sorted.map((player, index) => {
    const total = scores[player.id];
    if (previous === null || total !== previous) {
      rank = index + 1;
      previous = total;
    }
    return { player, total, rank };
  });
}

export function createGame(names: readonly string[], targetScore = TARGET_SCORE): Game {
  const players = names.map((name, index) => ({
    id: `p${index + 1}`,
    name: name.trim() === '' ? `Player ${index + 1}` : name.trim(),
  }));
  const now = Date.now();
  return {
    id: `game-${now}`,
    players,
    rounds: [],
    current: emptyRound(players),
    targetScore,
    createdAt: now,
    updatedAt: now,
  };
}

function updateHand(game: Game, playerId: string, update: (hand: Hand) => Hand): Game {
  if (game.current === null) {
    return game;
  }
  const current: Round = {
    hands: { ...game.current.hands, [playerId]: update(handOf(game.current, playerId)) },
  };
  return { ...game, current, updatedAt: Date.now() };
}

function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function applyAction(game: Game, action: GameAction): Game {
  switch (action.type) {
    case 'setPoints':
      return updateHand(game, action.playerId, (hand) => ({
        ...hand,
        numbers: [],
        modifiers: [],
        points: action.points,
      }));
    case 'toggleNumber':
      return updateHand(game, action.playerId, (hand) => ({
        ...hand,
        points: null,
        numbers: toggle(hand.numbers, action.value).sort((a, b) => a - b),
      }));
    case 'toggleModifier':
      return updateHand(game, action.playerId, (hand) => ({
        ...hand,
        points: null,
        modifiers: MODIFIER_CARDS.filter((modifier) =>
          toggle(hand.modifiers, action.modifier).includes(modifier)
        ),
      }));
    case 'toggleBusted':
      return updateHand(game, action.playerId, (hand) => ({ ...hand, busted: !hand.busted }));
    case 'clearHand':
      return updateHand(game, action.playerId, emptyHand);
    case 'endRound': {
      if (game.current === null) {
        return game;
      }
      const rounds = [...game.rounds, game.current];
      const played: Game = { ...game, rounds, current: null, updatedAt: Date.now() };
      return isGameOver(played) ? played : { ...played, current: emptyRound(game.players) };
    }
    case 'undoRound': {
      const previous = game.rounds.at(-1);
      if (previous === undefined) {
        return game;
      }
      return {
        ...game,
        rounds: game.rounds.slice(0, -1),
        current: previous,
        updatedAt: Date.now(),
      };
    }
  }
}
