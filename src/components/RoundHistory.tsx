import React from 'react';
import { Game, handOf, hasFlip7, scoreHand, totals } from '../game';

interface RoundHistoryProps {
  game: Game;
}

export const RoundHistory: React.FC<RoundHistoryProps> = ({ game }) => {
  if (game.rounds.length === 0) {
    return null;
  }

  const runningTotals = totals(game);

  return (
    <div className="panel">
      <h2>Round history</h2>
      <div className="history-scroll">
        <table className="history">
          <thead>
            <tr>
              <th className="round-label">Round</th>
              {game.players.map((player) => (
                <th key={player.id}>{player.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.rounds.map((round, index) => (
              <tr key={index}>
                <th className="round-label">{index + 1}</th>
                {game.players.map((player) => {
                  const hand = handOf(round, player.id);
                  const score = scoreHand(hand);
                  return (
                    <td key={player.id} className={hand.busted ? 'zero' : undefined}>
                      {score}
                      {hasFlip7(hand) ? ' ★' : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="round-label">Total</th>
              {game.players.map((player) => (
                <td key={player.id}>{runningTotals[player.id]}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
