
import React from 'react';
import { Card as CardType } from '../types/poker';
import PokerCard from './PokerCard';

interface CommunityCardsProps {
  cards: CardType[];
  round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards, round }) => {
  // Determine which cards to show based on the round
  const visibleCards = () => {
    switch (round) {
      case 'preflop':
        return [];
      case 'flop':
        return cards.slice(0, 3);
      case 'turn':
        return cards.slice(0, 4);
      case 'river':
      case 'showdown':
        return cards.slice(0, 5);
      default:
        return [];
    }
  };

  const visible = visibleCards();

  if (visible.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center">
        <div className="text-white text-opacity-50">Waiting for flop</div>
      </div>
    );
  }

  return (
    <div className="flex gap-1 sm:gap-2 justify-center py-4">
      {visible.map((card, index) => (
        <PokerCard 
          key={`community-${card.suit}-${card.rank}-${index}`}
          card={{...card, faceUp: true}}
          className="animate-card-deal"
          style={{ 
            animationDelay: `${index * 0.1}s`,
            animationFillMode: 'backwards'
          }} 
        />
      ))}
    </div>
  );
};

export default CommunityCards;
