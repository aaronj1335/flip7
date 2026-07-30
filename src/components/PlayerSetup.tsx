import React, { useState } from 'react';
import { Game, TARGET_SCORE, totals } from '../game';

interface PlayerSetupProps {
  recentGames: readonly Game[];
  onStart: (names: readonly string[], targetScore: number) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

const MAX_PLAYERS = 12;

function describe(game: Game): string {
  const scores = totals(game);
  return game.players.map((player) => `${player.name} ${scores[player.id]}`).join(' · ');
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({
  recentGames,
  onStart,
  onResume,
  onDelete,
}) => {
  const [names, setNames] = useState<string[]>(['', '']);
  const [targetScore, setTargetScore] = useState<string>(String(TARGET_SCORE));

  const parsedTarget = Number.parseInt(targetScore, 10);
  const target = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : TARGET_SCORE;

  const setName = (index: number, value: string) => {
    setNames((previous) => previous.map((name, i) => (i === index ? value : name)));
  };

  const removeName = (index: number) => {
    setNames((previous) => previous.filter((_, i) => i !== index));
  };

  return (
    <>
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          onStart(names, target);
        }}
      >
        <h2>New game</h2>
        <div className="setup-players">
          {names.map((name, index) => (
            <div className="setup-player" key={index}>
              <input
                value={name}
                placeholder={`Player ${index + 1}`}
                aria-label={`Player ${index + 1} name`}
                onChange={(event) => setName(index, event.target.value)}
              />
              <button
                type="button"
                aria-label={`Remove player ${index + 1}`}
                disabled={names.length <= 1}
                onClick={() => removeName(index)}
              >
                &minus;
              </button>
            </div>
          ))}
        </div>

        <div className="setup-target">
          <label htmlFor="target-score">Play to</label>
          <input
            id="target-score"
            type="number"
            min="1"
            value={targetScore}
            onChange={(event) => setTargetScore(event.target.value)}
          />
          <span>points</span>
        </div>

        <div className="button-row">
          <button
            type="button"
            disabled={names.length >= MAX_PLAYERS}
            onClick={() => setNames((previous) => [...previous, ''])}
          >
            Add player
          </button>
          <button type="submit" className="button-primary">
            Start game
          </button>
        </div>
      </form>

      {recentGames.length === 0 ? null : (
        <div className="panel">
          <h2>Saved games</h2>
          {recentGames.map((game) => (
            <div className="recent-game" key={game.id}>
              <span className="recent-players">{describe(game)}</span>
              <span className="recent-meta">
                {game.rounds.length} {game.rounds.length === 1 ? 'round' : 'rounds'}
              </span>
              <button type="button" onClick={() => onResume(game.id)}>
                Resume
              </button>
              <button
                type="button"
                aria-label="Delete saved game"
                onClick={() => onDelete(game.id)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="panel rules">
        <h2>How scoring works</h2>
        <ul>
          <li>Tap a player to record the cards they collected this round.</li>
          <li>A bust scores 0, whatever else the player flipped.</li>
          <li>
            <strong>x2</strong> doubles the number cards, then <strong>+</strong> cards are added.
          </li>
          <li>Seven unique number cards is a Flip 7: +15 bonus.</li>
          <li>Everything is saved in this browser as you tap, so a refresh is safe.</li>
        </ul>
      </div>
    </>
  );
};
