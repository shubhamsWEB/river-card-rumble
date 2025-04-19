import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useAuth } from "@/contexts/AuthContext";
import PlayerPosition from './PlayerPosition';
import CommunityCards from './CommunityCards';
import ActionButtons from './ActionButtons';
import ChatBox from './ChatBox';
import PokerChip from './PokerChip';
import { ChatMessage, Card as PokerCard, Player } from '../types/poker';
import { v4 as uuidv4 } from 'uuid';
import { Loader2 } from 'lucide-react';

interface PokerTableProps {
  tableId: string;
  onAction: (action: string, amount?: number) => void;
  onSendMessage: (message: string) => void;
}

const PokerTable: React.FC<PokerTableProps> = ({ tableId, onAction, onSendMessage }) => {
  const { user, profile } = useAuth();
  const { subscribe } = useRealtime();
  
  const [isLoading, setIsLoading] = useState(true);
  const [table, setTable] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<PokerCard[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: tableData, error: tableError } = await supabase
          .from('poker_tables')
          .select('*')
          .eq('id', tableId)
          .single();
        
        if (tableError) throw tableError;
        setTable(tableData);
        
        await loadPlayers();
        
        await loadCommunityCards();
        
        await loadChatMessages();
        
        const unsubscribe = subscribe(tableId, handleRealtimeUpdate);
        
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error loading table data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [tableId]);
  
  useEffect(() => {
    if (players.length > 0 && user) {
      const currentPlayerData = players.find(p => p.id === user.id);
      setCurrentPlayer(currentPlayerData || null);
    }
  }, [players, user]);
  
  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('table_players')
        .select(`
          id,
          user_id,
          position,
          chips,
          current_bet,
          is_active,
          is_dealer,
          is_small_blind,
          is_big_blind,
          is_turn,
          is_folded,
          is_all_in,
          cards,
          profiles:user_id(username, avatar_url)
        `)
        .eq('table_id', tableId);
      
      if (error) throw error;
      
      const formattedPlayers = (data || []).map(item => {
        let playerCards: PokerCard[] = [];
        if (item.cards && Array.isArray(item.cards)) {
          playerCards = item.cards.map((card: any) => ({
            suit: card.suit,
            rank: card.rank,
            faceUp: Boolean(card.faceUp)
          }));
        }

        return {
          id: item.user_id,
          name: item.profiles?.username || 'Unknown',
          position: item.position,
          chips: item.chips,
          cards: playerCards,
          isActive: item.is_active,
          isTurn: item.is_turn,
          isFolded: item.is_folded,
          isAllIn: item.is_all_in,
          isDealer: item.is_dealer,
          isSmallBlind: item.is_small_blind,
          isBigBlind: item.is_big_blind,
          currentBet: item.current_bet,
          avatar: item.profiles?.avatar_url || undefined
        };
      });
      
      setPlayers(formattedPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };
  
  const loadCommunityCards = async () => {
    try {
      const { data, error } = await supabase
        .from('community_cards')
        .select('*')
        .eq('table_id', tableId)
        .order('card_index', { ascending: true });
      
      if (error) throw error;
      
      const cards = (data || []).map(card => ({
        suit: card.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
        rank: card.rank as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A',
        faceUp: true
      }));
      
      const allCards: PokerCard[] = Array(5).fill(null).map((_, i) => {
        return cards[i] || { suit: 'spades' as const, rank: 'A' as const, faceUp: false };
      });
      
      setCommunityCards(allCards);
    } catch (error) {
      console.error('Error loading community cards:', error);
    }
  };
  
  const loadChatMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          user_id,
          message,
          created_at,
          profiles:user_id(username)
        `)
        .eq('table_id', tableId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      
      const messages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        playerId: msg.user_id,
        playerName: msg.profiles?.username || 'Unknown',
        message: msg.message,
        timestamp: new Date(msg.created_at).getTime()
      }));
      
      setChatMessages(messages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };
  
  const handleRealtimeUpdate = async (update: any) => {
    switch (update.type) {
      case 'table':
        setTable(update.payload.new);
        break;
        
      case 'player':
        await loadPlayers();
        break;
        
      case 'card':
        await loadCommunityCards();
        break;
        
      case 'chat':
        if (update.payload.eventType === 'INSERT') {
          const { data, error } = await supabase
            .from('chat_messages')
            .select(`
              id,
              user_id,
              message,
              created_at,
              profiles:user_id(username)
            `)
            .eq('id', update.payload.new.id)
            .single();
          
          if (!error && data) {
            const newMessage: ChatMessage = {
              id: data.id,
              playerId: data.user_id,
              playerName: data.profiles?.username || 'Unknown',
              message: data.message,
              timestamp: new Date(data.created_at).getTime()
            };
            
            setChatMessages(prev => [...prev, newMessage]);
          }
        }
        break;
        
      case 'action':
        break;
    }
  };
  
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
  
  const handleSendMessage = (message: string) => {
    onSendMessage(message);
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
                    style={{ animationDelay: `${i * 0.05}s` }} 
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
              onAction={onAction}
            />
          </div>
        )}
        
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-4 py-1 rounded-full">
          <div className="text-white text-sm">
            <span className="mr-3">Small Blind: ${table.small_blind}</span>
            <span className="mr-3">Big Blind: ${table.big_blind}</span>
            <span>Round: {table.current_round}</span>
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
