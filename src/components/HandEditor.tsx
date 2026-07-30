import React from 'react';
import {
  FLIP_7_BONUS,
  Hand,
  MODIFIER_CARDS,
  Modifier,
  NUMBER_CARDS,
  hasFlip7,
  isTyped,
  scoreHand,
} from '../game';

interface HandEditorProps {
  hand: Hand;
  onToggleNumber: (value: number) => void;
  onToggleModifier: (modifier: Modifier) => void;
  onToggleBusted: () => void;
  onClear: () => void;
}

export const HandEditor: React.FC<HandEditorProps> = ({
  hand,
  onToggleNumber,
  onToggleModifier,
  onToggleBusted,
  onClear,
}) => {
  const score = scoreHand(hand);

  return (
    <div className="hand-editor">
      <h3>Number cards</h3>
      <div className="card-grid">
        {NUMBER_CARDS.map((value) => (
          <button
            key={value}
            type="button"
            className={`card-button${hand.numbers.includes(value) ? ' selected' : ''}`}
            aria-pressed={hand.numbers.includes(value)}
            onClick={() => onToggleNumber(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <h3>Modifiers &amp; bust</h3>
      <div className="card-grid">
        {MODIFIER_CARDS.map((modifier) => (
          <button
            key={modifier}
            type="button"
            className={`card-button modifier${hand.modifiers.includes(modifier) ? ' selected' : ''}`}
            aria-pressed={hand.modifiers.includes(modifier)}
            onClick={() => onToggleModifier(modifier)}
          >
            {modifier}
          </button>
        ))}
        <button
          type="button"
          className={`card-button bust${hand.busted ? ' selected' : ''}`}
          aria-pressed={hand.busted}
          onClick={onToggleBusted}
        >
          Bust
        </button>
      </div>

      <div className="hand-editor-footer">
        <span>
          {hand.busted
            ? 'Busted, scores 0 for the round'
            : `Round score ${score}${hasFlip7(hand) ? ` (includes the +${FLIP_7_BONUS} Flip 7 bonus)` : ''}${
                isTyped(hand) ? ', typed in directly' : ''
              }`}
        </span>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
};
