import React from 'react';
import { GameAction, Player, Round, handOf, hasFlip7, scoreHand } from '../game';
import { HandCards } from './HandCards';
import { HandEditor } from './HandEditor';
import { PointsInput } from './PointsInput';

interface RoundEditorProps {
  players: readonly Player[];
  round: Round;
  roundNumber: number;
  expandedPlayerId: string | null;
  onExpandPlayer: (playerId: string | null) => void;
  onAction: (action: GameAction) => void;
  canUndo: boolean;
}

export const RoundEditor: React.FC<RoundEditorProps> = ({
  players,
  round,
  roundNumber,
  expandedPlayerId,
  onExpandPlayer,
  onAction,
  canUndo,
}) => (
  <div className="panel">
    <h2>Round {roundNumber}</h2>
    <div className="hand-list">
      {players.map((player) => {
        const hand = handOf(round, player.id);
        const expanded = expandedPlayerId === player.id;
        const classNames = ['hand'];
        if (hand.busted) {
          classNames.push('busted');
        } else if (hasFlip7(hand)) {
          classNames.push('flip7');
        }

        return (
          <div className={classNames.join(' ')} key={player.id}>
            <div className="hand-row">
              <button
                type="button"
                className="hand-summary"
                aria-expanded={expanded}
                onClick={() => onExpandPlayer(expanded ? null : player.id)}
              >
                <span className="hand-name">{player.name}</span>
                <HandCards hand={hand} />
              </button>
              <PointsInput
                value={scoreHand(hand)}
                label={`${player.name} round score`}
                disabled={hand.busted}
                onChange={(points) => onAction({ type: 'setPoints', playerId: player.id, points })}
              />
            </div>
            {expanded ? (
              <HandEditor
                hand={hand}
                onToggleNumber={(value) =>
                  onAction({ type: 'toggleNumber', playerId: player.id, value })
                }
                onToggleModifier={(modifier) =>
                  onAction({ type: 'toggleModifier', playerId: player.id, modifier })
                }
                onToggleBusted={() => onAction({ type: 'toggleBusted', playerId: player.id })}
                onClear={() => onAction({ type: 'clearHand', playerId: player.id })}
              />
            ) : null}
          </div>
        );
      })}
    </div>
    <div className="button-row" style={{ marginTop: '0.9rem' }}>
      <button
        type="button"
        className="button-primary"
        onClick={() => {
          onExpandPlayer(null);
          onAction({ type: 'endRound' });
        }}
      >
        End round {roundNumber}
      </button>
      <button
        type="button"
        disabled={!canUndo}
        onClick={() => {
          onExpandPlayer(null);
          onAction({ type: 'undoRound' });
        }}
      >
        Undo last round
      </button>
    </div>
  </div>
);
