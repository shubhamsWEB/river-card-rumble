
import React, { useState } from 'react';
import { PokerTable as PokerTableType } from '../types/poker';
import PlayerPosition from './PlayerPosition';
import CommunityCards from './CommunityCards';
import ActionButtons from './ActionButtons';
import ChatBox from './ChatBox';
import PokerChip from './PokerChip';
import { ChatMessage } from '../types/poker';
import { v4 as uuidv4 } from 'uuid';

interface PokerTableProps {
  table: PokerTableType;
  chatMessages: ChatMessage[];
}

const PokerTable: React.FC<PokerTableProps> = ({ table, chatMessages: initialChatMessages }) => {
  const [localTable, setLocalTable] = useState<PokerTableType>(table);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  
  // Get current player (for this demo we assume it's player with position 0)
  const currentPlayer = localTable.players.find(p => p.position === 0);

  // Position players around the table
  const getPlayerPositionStyle = (position: number) => {
    // Calculate position around an oval table
    const totalPositions = 10; // 0-9 positions available
    const angle = (position / totalPositions) * 2 * Math.PI;
    
    // Oval parameters (adjust these to change the table shape)
    const radiusX = 42; // horizontal radius in percentage
    const radiusY = 30; // vertical radius in percentage
    
    // Calculate x and y coordinates
    const x = 50 + radiusX * Math.sin(angle);
    const y = 50 + radiusY * Math.cos(angle);
    
    return {
      position: 'absolute' as const,
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)'
    };
  };

  // Handle player actions
  const handleAction = (action: string, amount?: number) => {
    if (!currentPlayer) return;

    setLocalTable(prev => {
      // Create a copy of players
      const updatedPlayers = prev.players.map(player => {
        if (player.id === currentPlayer.id) {
          // Update the current player
          let updatedPlayer = { ...player, isTurn: false };
          
          switch (action) {
            case 'fold':
              updatedPlayer.isFolded = true;
              updatedPlayer.currentBet = 0;
              break;
            case 'check':
              // No changes to chips or current bet
              break;
            case 'call':
              if (amount) {
                const callAmount = Math.min(amount, player.chips);
                updatedPlayer.chips -= callAmount;
                updatedPlayer.currentBet += callAmount;
              }
              break;
            case 'bet':
            case 'raise':
              if (amount) {
                const betAmount = Math.min(amount, player.chips);
                updatedPlayer.chips -= betAmount;
                updatedPlayer.currentBet = betAmount;
              }
              break;
            case 'all-in':
              updatedPlayer.isAllIn = true;
              updatedPlayer.currentBet += updatedPlayer.chips;
              updatedPlayer.chips = 0;
              break;
          }
          
          return updatedPlayer;
        } else if (player.position === (currentPlayer.position + 2) % 10) {
          // Make next player's turn (for demo purposes, just go clockwise by 2 positions)
          return { ...player, isTurn: true };
        }
        return player;
      });
      
      // Calculate new pot
      const newPot = updatedPlayers.reduce((sum, player) => sum + player.currentBet, 0);
      
      // Update last action
      const lastAction = {
        playerId: currentPlayer.id,
        action: action as any,
        amount: amount
      };
      
      // Progress game round for demo purposes
      let newRound = prev.round;
      if (action !== 'fold' && (action === 'check' || action === 'call')) {
        // Simulate round progression
        if (prev.round === 'preflop') newRound = 'flop';
        else if (prev.round === 'flop') newRound = 'turn';
        else if (prev.round === 'turn') newRound = 'river';
        else if (prev.round === 'river') newRound = 'showdown';
      }
      
      return {
        ...prev,
        players: updatedPlayers,
        pot: newPot,
        currentBet: action === 'bet' || action === 'raise' ? (amount || prev.currentBet) : prev.currentBet,
        round: newRound,
        lastAction,
        activePlayerId: updatedPlayers.find(p => p.isTurn)?.id || null
      };
    });
  };

  // Handle chat messages
  const handleSendMessage = (message: string) => {
    if (!currentPlayer) return;
    
    const newMessage: ChatMessage = {
      id: uuidv4(),
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      message,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="relative w-full h-[calc(100vh-100px)] poker-table rounded-full overflow-hidden">
      {/* Table felt */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Community cards and pot */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <CommunityCards cards={localTable.communityCards} round={localTable.round} />
          
          {localTable.pot > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex -space-x-1">
                {[...Array(Math.min(5, Math.ceil(localTable.pot / 20)))].map((_, i) => (
                  <PokerChip 
                    key={i} 
                    value={20} 
                    className="animate-chip-toss" 
                    style={{ animationDelay: `${i * 0.05}s` }} 
                  />
                ))}
              </div>
              <div className="text-white font-bold mt-1">Pot: ${localTable.pot}</div>
            </div>
          )}
        </div>
        
        {/* Players positioned around the table */}
        {localTable.players.map(player => (
          <div key={player.id} style={getPlayerPositionStyle(player.position)}>
            <PlayerPosition 
              player={player} 
              isCurrentUser={player.position === 0} 
            />
          </div>
        ))}
        
        {/* Action buttons */}
        {currentPlayer?.isTurn && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <ActionButtons
              currentBet={localTable.currentBet}
              pot={localTable.pot}
              playerChips={currentPlayer.chips}
              onAction={handleAction}
            />
          </div>
        )}
        
        {/* Game info */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-4 py-1 rounded-full">
          <div className="text-white text-sm">
            <span className="mr-3">Small Blind: ${localTable.smallBlind}</span>
            <span className="mr-3">Big Blind: ${localTable.bigBlind}</span>
            <span>Round: {localTable.round}</span>
          </div>
        </div>
        
        {/* Chat box */}
        <div className="absolute bottom-4 right-4 w-64">
          <ChatBox 
            messages={chatMessages} 
            onSendMessage={handleSendMessage} 
          />
        </div>
      </div>
    </div>
  );
};

export default PokerTable;
