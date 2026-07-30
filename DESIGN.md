# Design

A single-page React app that keeps score for the Flip 7 card game and never loses progress.

## Goals

- Recording a round should be faster than doing the arithmetic in your head: tap the cards a player
  flipped, read the score.
- A refresh, a phone locking, or a browser crash must not lose the game — including a round that is
  half entered.
- Ship as one static file on GitHub Pages. No server, no accounts, no network dependency after load.

## State

```
Game
  id, createdAt, updatedAt
  targetScore                first player past this wins
  players: Player[]          { id, name }
  rounds: Round[]            rounds already committed
  current: Round | null      the round being entered, null once the game is won

Round
  hands: Record<playerId, Hand>

Hand
  numbers: number[]          0..12, unique, sorted
  modifiers: Modifier[]      'x2' | '+2' | '+4' | '+6' | '+8' | '+10'
  busted: boolean
  points?: number | null     a score typed in directly, overriding the cards
```

`current` being a distinct field rather than the last element of `rounds` keeps two questions
separate: what has been scored, and what is being edited. Totals only ever count `rounds`, so the
scoreboard cannot be moved by a half-entered hand, while the in-progress hand still has somewhere
durable to live.

### Scoring

At the table people usually just add up the numbers on the cards they flipped, so a round score can
be typed straight in. `points` holds that number and takes precedence over the cards:

1. A busted hand scores 0, regardless of what else it holds.
2. If `points` is set, that is the score, exactly as entered.
3. Otherwise `scoreCards` sums the number cards, doubles that sum if the hand holds `x2`, adds each
   `+n` card, and adds 15 for a Flip 7 (seven number cards).

`x2` deliberately applies before the `+` cards and does not multiply the Flip 7 bonus. A typed score
never picks up a Flip 7 bonus — the number entered is the whole answer.

Exactly one of `points` and the cards is ever populated, enforced in the reducer: typing clears the
cards, and tapping a card clears `points`. That is what keeps a row from displaying a card breakdown
that disagrees with the number beside it. `points` is optional on the interface because games saved
before it existed have no such field; `?? null` covers both.

### Transitions

All state changes go through `applyAction(game, action): Game` in `src/game.ts` — a pure reducer
covering `setPoints`, `toggleNumber`, `toggleModifier`, `toggleBusted`, `clearHand`, `endRound` and
`undoRound`. Every card tap is a toggle, so a mis-tap is undone by tapping again.

`endRound` pushes `current` onto `rounds`, then either opens a fresh round or, if someone has crossed
`targetScore`, sets `current` to `null` and ends the game. `undoRound` is the exact inverse: it pops
the last round back into `current`, which also reopens a game that was won by mistake.

Because the reducer is pure and browser-free, the rules are tested directly in `src/game.test.ts`
with no DOM and no database.

## Persistence

`src/db.ts` wraps IndexedDB behind a `GameStore` interface with two object stores:

- `games`, keyed by `game.id`, holding whole game objects.
- `meta`, holding `activeGameId` so a reload knows which game to reopen.

Games are small (a few hundred bytes), so each mutation writes the whole object rather than a delta —
there is no reconciliation to get wrong, and the record on disk is always a complete, valid game.
`save` writes the game and the active-game pointer in one transaction, so the two can never disagree.

`createGameStore` takes an `IDBFactory` rather than reaching for the global, which lets the tests in
`src/db.test.ts` drive the real code against `fake-indexeddb` and lets the app degrade to in-memory
state where IndexedDB is unavailable.

`src/useGame.ts` is the seam between the two halves: it holds the game in React state, dispatches
reducer actions, and writes the result to the store. Rendering never awaits the database.

## UI

One column, sized for a phone held over a table:

- **Scoreboard** — standings, each player's live score for the round in progress, and points needed
  to win.
- **Round editor** — one row per player: their cards as chips, and their round score as an editable
  field so the common case is one tap and a number. Tapping the name expands a card pad for hands
  worth working through; only one is open at a time so the list stays scannable.
- **Round history** — every committed round as a table, with busts in red and Flip 7 rounds starred.

Components are presentational and take a `Game` (or a `Hand`) plus callbacks, which makes them
renderable with `react-dom/server` and coverable by HTML snapshot tests.

## Build and deploy

`scripts/build.ts` bundles with esbuild and inlines the JS and CSS into `index.html`, emitting one
self-contained file to stdout. `scripts/dev.ts` serves the same entry point with esbuild's watch mode
and a server-sent-events reload. CI lints, typechecks, tests, builds, and publishes the single file to
GitHub Pages on every push to `main`.
