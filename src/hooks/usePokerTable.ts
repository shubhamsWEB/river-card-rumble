
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
        current_round: (tableData.current_round || 'preflop') as "preflop" | "flop" | "turn" | "river" | "showdown"
      };
      
      setTable(typedTableData);
      
      await Promise.all([
        loadPlayers(),
        loadCommunityCards(),
        loadChatMessages()
      ]);
      
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
      // First fetch the table players
      const { data: playerData, error: playerError } = await supabase
        .from('table_players')
        .select('*')
        .eq('table_id', tableId);
      
      if (playerError) throw playerError;
      
      // Then fetch the profiles separately
      const userIds = (playerData || []).map(player => player.user_id);
      
      // Only fetch profiles if we have user IDs
      if (userIds.length === 0) {
        setPlayers([]);
        return;
      }
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Create a map of user IDs to profiles for easy lookup
      const profileMap = new Map();
      (profilesData || []).forEach(profile => {
        profileMap.set(profile.id, profile);
      });
      
      const formattedPlayers = (playerData || []).map(item => {
        const profile = profileMap.get(item.user_id);
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
      // Don't throw - we want to continue even if player loading fails
      setPlayers([]);
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
      setCommunityCards(Array(5).fill(null).map(() => ({ 
        suit: 'spades' as const, rank: 'A' as const, faceUp: false 
      })));
    }
  };

  const loadChatMessages = async () => {
    try {
      // Fetch chat messages and user profiles separately
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('table_id', tableId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (messagesError) throw messagesError;
      
      // Get unique user IDs
      const userIds = [...new Set((messagesData || []).map(msg => msg.user_id))];
      
      // Only fetch profiles if we have messages
      if (userIds.length === 0) {
        setChatMessages([]);
        return;
      }
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Create a map of user IDs to usernames for easy lookup
      const usernameMap = new Map();
      (profilesData || []).forEach(profile => {
        usernameMap.set(profile.id, profile.username);
      });
      
      const messages: ChatMessage[] = (messagesData || []).map(msg => {
        const username = usernameMap.get(msg.user_id) || 'Unknown';
        
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
      // Don't throw - we want to continue even if chat loading fails
      setChatMessages([]);
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
