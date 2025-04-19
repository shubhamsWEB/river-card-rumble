import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { DbPokerTable, Card, ChatMessage } from '../types/poker';
import { toast } from "@/components/ui/use-toast";

export const usePokerTable = (tableId: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [table, setTable] = useState<DbPokerTable | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('*')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      const typedTableData: DbPokerTable = {
        ...tableData,
        status: tableData.status as "waiting" | "playing" | "finished",
        current_round: tableData.current_round as "preflop" | "flop" | "turn" | "river" | "showdown"
      };
      
      setTable(typedTableData);
      
      await loadPlayers();
      await loadCommunityCards();
      await loadChatMessages();
      
    } catch (error) {
      console.error('Error loading table data:', error);
      toast({
        title: "Error",
        description: "Failed to load table data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          profiles:user_id (username, avatar_url)
        `)
        .eq('table_id', tableId);
      
      if (error) throw error;
      
      const formattedPlayers = (data || []).map(item => {
        const profile = item.profiles as any;
        const username = profile?.username || 'Unknown';
        const avatar = profile?.avatar_url || null;
        
        let playerCards: Card[] = [];
        if (item.cards) {
          try {
            playerCards = (item.cards as any[]).map(card => ({
              suit: card.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
              rank: card.rank as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A',
              faceUp: !!card.faceUp
            }));
          } catch (e) {
            console.error('Error parsing player cards:', e);
            playerCards = [];
          }
        }
        
        return {
          id: item.user_id,
          name: username,
          position: item.position,
          chips: item.chips,
          cards: playerCards,
          isActive: item.is_active || false,
          isTurn: item.is_turn || false,
          isFolded: item.is_folded || false,
          isAllIn: item.is_all_in || false,
          isDealer: item.is_dealer || false,
          isSmallBlind: item.is_small_blind || false,
          isBigBlind: item.is_big_blind || false,
          currentBet: item.current_bet || 0,
          avatar: avatar
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
      
      const allCards: Card[] = Array(5).fill(null).map((_, i) => {
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
          profiles:user_id (username)
        `)
        .eq('table_id', tableId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      
      const messages: ChatMessage[] = (data || []).map(msg => {
        const profile = msg.profiles as any;
        const username = profile?.username || 'Unknown';
        
        return {
          id: msg.id,
          playerId: msg.user_id,
          playerName: username,
          message: msg.message,
          timestamp: new Date(msg.created_at).getTime()
        };
      });
      
      setChatMessages(messages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [tableId]);

  return {
    isLoading,
    table,
    players,
    communityCards,
    chatMessages,
    reloadData: loadData,
    reloadPlayers: loadPlayers,
    reloadCommunityCards: loadCommunityCards,
    reloadChatMessages: loadChatMessages
  };
};
