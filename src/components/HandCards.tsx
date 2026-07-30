import React from 'react';
import { Hand, hasFlip7, isHandEmpty } from '../game';

interface HandCardsProps {
  hand: Hand;
}

export const HandCards: React.FC<HandCardsProps> = ({ hand }) => {
  if (isHandEmpty(hand)) {
    return <span className="hand-empty">No cards yet</span>;
  }

  return (
    <span className="hand-cards">
      {hand.numbers.map((value) => (
        <span className="chip" key={`number-${value}`}>
          {value}
        </span>
      ))}
      {hand.modifiers.map((modifier) => (
        <span className="chip modifier" key={`modifier-${modifier}`}>
          {modifier}
        </span>
      ))}
      {hand.busted ? <span className="chip bust">BUST</span> : null}
      {hasFlip7(hand) ? <span className="chip flip7">FLIP 7</span> : null}
    </span>
  );
};
