
import React, { useEffect } from 'react';
import { useRealtime } from "@/contexts/RealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import PlayerPosition from './PlayerPosition';
import CommunityCards from './CommunityCards';
import ActionButtons from './ActionButtons';
import ChatBox from './ChatBox';
import PokerChip from './PokerChip';
import { Player } from '../types/poker';
import { Loader2 } from 'lucide-react';
import { usePokerTable } from '@/hooks/usePokerTable';
import { useTableActions } from '@/hooks/useTableActions';

interface PokerTableProps {
  tableId: string;
  onAction: (action: string, amount?: number) => void;
  onSendMessage: (message: string) => void;
}

const PokerTable: React.FC<PokerTableProps> = ({ tableId, onAction, onSendMessage }) => {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  
  const {
    isLoading,
    table,
    players,
    communityCards,
    chatMessages,
    reloadPlayers,
    reloadCommunityCards,
    reloadChatMessages
  } = usePokerTable(tableId);

  const { 
    handlePlayerAction, 
    handleSendMessage, 
    checkAndStartGame,
    advanceGameRound
  } = useTableActions(tableId);
  
  const currentPlayer = players.find(p => p.id === user?.id) || null;
  
  // Check if game should start when players change
  useEffect(() => {
    if (players.length >= 2 && table?.status === 'waiting') {
      checkAndStartGame();
    }
  }, [players.length, table?.status]);

  // Subscribe to table updates
  useEffect(() => {
    const unsubscribe = subscribe(tableId, async (update: any) => {
      switch (update.type) {
        case 'player':
          await reloadPlayers();
          break;
        case 'card':
          await reloadCommunityCards();
          break;
        case 'chat':
          if (update.payload.eventType === 'INSERT') {
            await reloadChatMessages();
          }
          break;
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [tableId]);
  
  const getPlayerPositionStyle = (position: number) => {
    const totalPositions = 10;
    const angle = (position / totalPositions) * 2 * Math.PI;
    
    const radiusX = 42;
    const radiusY = 30;
    
    const x = 50 + radiusX * Math.sin(angle);
    const y = 50 + radiusY * Math.cos(angle);
    
    return {
      position: 'absolute' as const,
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)'
    };
  };

  if (isLoading || !table) {
    return (
      <div className="w-full h-[calc(100vh-100px)] flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
          <p className="text-white text-lg">Loading poker table...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-100px)] poker-table rounded-full overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <CommunityCards cards={communityCards} round={table.current_round} />
          
          {table.pot > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex -space-x-1">
                {[...Array(Math.min(5, Math.ceil(table.pot / 20)))].map((_, i) => (
                  <PokerChip 
                    key={i} 
                    value={20} 
                    className="animate-chip-toss" 
                    style={{ 
                      animationDelay: `${i * 0.05}s`, 
                      animationFillMode: 'backwards'
                    }} 
                  />
                ))}
              </div>
              <div className="text-white font-bold mt-1">Pot: ${table.pot}</div>
            </div>
          )}
        </div>
        
        {players.map(player => (
          <div key={player.id} style={getPlayerPositionStyle(player.position)}>
            <PlayerPosition 
              player={player} 
              isCurrentUser={player.id === user?.id} 
            />
          </div>
        ))}
        
        {currentPlayer?.isTurn && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <ActionButtons
              currentBet={table.current_bet}
              pot={table.pot}
              playerChips={currentPlayer.chips}
              onAction={handlePlayerAction}
            />
          </div>
        )}
        
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-4 py-1 rounded-full">
          <div className="text-white text-sm">
            <span className="mr-3">Small Blind: ${table.small_blind}</span>
            <span className="mr-3">Big Blind: ${table.big_blind}</span>
            <span className="mr-3">Round: {table.current_round}</span>
            <span>Status: {table.status}</span>
          </div>
        </div>
        
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
