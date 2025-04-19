
import React from 'react';
import { Card as CardType } from '../types/poker';

interface PokerCardProps {
  card: CardType;
  className?: string;
  style?: React.CSSProperties;
}

const PokerCard: React.FC<PokerCardProps> = ({ card, className = '', style }) => {
  const { suit, rank, faceUp } = card;

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black';
  };

  if (!faceUp) {
    return (
      <div className={`poker-card relative w-16 h-24 rounded-md overflow-hidden shadow-md ${className}`} style={style}>
        <div className="poker-card-back absolute inset-0 bg-poker-card-back border-2 border-white flex items-center justify-center">
          <div className="text-white text-opacity-30 text-4xl font-bold">♠</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`poker-card relative w-16 h-24 rounded-md overflow-hidden shadow-md ${className}`} style={style}>
      <div className="poker-card-front absolute inset-0 bg-poker-card border-2 border-gray-200 p-1 flex flex-col">
        <div className={`text-xs font-bold ${getSuitColor(suit)} flex items-center justify-between`}>
          <span>{rank}</span>
          <span>{getSuitSymbol(suit)}</span>
        </div>
        <div className={`text-3xl flex-grow flex items-center justify-center ${getSuitColor(suit)}`}>
          {getSuitSymbol(suit)}
        </div>
        <div className={`text-xs font-bold ${getSuitColor(suit)} flex items-center justify-between rotate-180`}>
          <span>{rank}</span>
          <span>{getSuitSymbol(suit)}</span>
        </div>
      </div>
    </div>
  );
};

export default PokerCard;
