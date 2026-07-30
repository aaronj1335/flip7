import React from 'react';
import { Game, handOf, isGameOver, scoreHand, standings } from '../game';

interface ScoreboardProps {
  game: Game;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ game }) => {
  const rows = standings(game);
  const over = isGameOver(game);
  const best = rows.length > 0 ? rows[0].total : 0;

  return (
    <div className="panel">
      <h2>Scoreboard &mdash; first to {game.targetScore}</h2>
      <table className="scoreboard">
        <thead>
          <tr>
            <th aria-label="Rank" />
            <th>Player</th>
            {game.current === null ? null : <th>Round</th>}
            <th>Total</th>
            <th>{over ? '' : 'To win'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player, total, rank }) => {
            const leading = total === best && total > 0;
            const classNames: string[] = [];
            if (leading) {
              classNames.push(over ? 'winner' : 'leader');
            }
            return (
              <tr key={player.id} className={classNames.join(' ') || undefined}>
                <td className="rank">{rank}</td>
                <td className="name">{player.name}</td>
                {game.current === null ? null : (
                  <td className="round-score">
                    {`+${scoreHand(handOf(game.current, player.id))}`}
                  </td>
                )}
                <td className="total">{total}</td>
                <td className="round-score">
                  {over ? '' : Math.max(game.targetScore - total, 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
