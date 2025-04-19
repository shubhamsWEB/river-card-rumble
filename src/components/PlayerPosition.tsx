
import React from 'react';
import { Player } from '../types/poker';
import PokerCard from './PokerCard';
import PokerChip from './PokerChip';

interface PlayerPositionProps {
  player: Player;
  isCurrentUser: boolean;
}

const PlayerPosition: React.FC<PlayerPositionProps> = ({ player, isCurrentUser }) => {
  const { name, chips, cards, isTurn, isFolded, isDealer, isSmallBlind, isBigBlind, currentBet } = player;

  // Dealer button and blind indicators
  const renderPositionMarkers = () => {
    return (
      <div className="flex gap-1 mt-1">
        {isDealer && (
          <span className="bg-white text-black text-xs px-2 rounded-full border border-black">D</span>
        )}
        {isSmallBlind && (
          <span className="bg-white text-black text-xs px-2 rounded-full border border-black">SB</span>
        )}
        {isBigBlind && (
          <span className="bg-white text-black text-xs px-2 rounded-full border border-black">BB</span>
        )}
      </div>
    );
  };

  // Current bet display
  const renderCurrentBet = () => {
    if (currentBet > 0) {
      return (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <PokerChip value={currentBet} size="sm" />
          <span className="text-white text-xs mt-1">{currentBet}</span>
        </div>
      );
    }
    return null;
  };

  // Render player cards
  const renderCards = () => {
    if (cards.length === 0) return null;

    if (isFolded) {
      return (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 -rotate-12">
          <div className="relative">
            <PokerCard card={{ ...cards[0], faceUp: false }} className="opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-red-600 text-white px-2 py-1 rounded-md text-xs transform rotate-12">Folded</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 flex -space-x-4">
        <PokerCard card={{ ...cards[0], faceUp: isCurrentUser }} className="transform -rotate-12 animate-card-deal" />
        <PokerCard card={{ ...cards[1], faceUp: isCurrentUser }} className="transform rotate-12 animate-card-deal" style={{ animationDelay: '0.1s' }} />
      </div>
    );
  };

  return (
    <div className={`relative p-4 ${isTurn ? 'ring-4 ring-poker-gold' : ''}`}>
      {renderCards()}
      
      <div className={`bg-gray-800 bg-opacity-80 p-2 rounded-md text-center ${isFolded ? 'opacity-50' : ''}`}>
        <div className="text-white font-bold text-sm truncate">{name}</div>
        <div className="text-poker-gold text-xs">${chips}</div>
        {renderPositionMarkers()}
      </div>
      
      {renderCurrentBet()}
    </div>
  );
};

export default PlayerPosition;
