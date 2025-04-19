
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Rank, Suit, Json } from "@/types/poker";

export const useGameStartup = (tableId: string) => {
  const { user } = useAuth();

  const checkAndStartGame = async () => {
    try {
      // Get table info
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('status, current_dealer_position')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Only proceed if table is in waiting status
      if (tableData.status !== 'waiting') {
        return;
      }
      
      // Count players at the table
      const { count, error: countError } = await supabase
        .from('table_players')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', tableId);
      
      if (countError) throw countError;
      
      // Start game if 2 or more players have joined
      if (count !== null && count >= 2) {
        await startGame();
      }
    } catch (error: any) {
      console.error('Error checking if game should start:', error);
    }
  };

  // Create a seeded random number generator to ensure consistent cards
  const seedRandom = (seed: string) => {
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };
    
    const seedValue = hashCode(seed);
    let state = seedValue;
    
    return () => {
      state = (state * 1664525 + 1013904223) % 2147483648;
      return state / 2147483648;
    };
  };

  const dealCards = (playerPosition: number, tableId: string): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Create a seeded random generator based on player position and table ID
    // This ensures the same player gets the same cards if the game is reloaded
    const random = seedRandom(`${tableId}-${playerPosition}`);
    
    // Select two cards with the seeded random generator
    const card1Suit = suits[Math.floor(random() * suits.length)];
    const card1Rank = ranks[Math.floor(random() * ranks.length)];
    
    const card2Suit = suits[Math.floor(random() * suits.length)];
    const card2Rank = ranks[Math.floor(random() * ranks.length)];
    
    return [
      { suit: card1Suit, rank: card1Rank, faceUp: false },
      { suit: card2Suit, rank: card2Rank, faceUp: false }
    ];
  };

  const startGame = async () => {
    try {
      // Get players at the table
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, position')
        .eq('table_id', tableId)
        .order('position', { ascending: true });
      
      if (playersError) throw playersError;
      
      if (!players || players.length < 2) {
        return;
      }
      
      // Get table info
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('small_blind, big_blind')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Determine dealer position (randomly choose first player if no dealer yet)
      const dealerPosition = Math.floor(Math.random() * players.length);
      
      // Calculate small blind and big blind positions
      const numPlayers = players.length;
      const sbPosition = (dealerPosition + 1) % numPlayers;
      const bbPosition = (dealerPosition + 2) % numPlayers;
      const firstToActPosition = (bbPosition + 1) % numPlayers;
      
      // Clear any previous game state
      await clearCommunityCards();
      
      // Update table status to playing
      await supabase
        .from('poker_tables')
        .update({
          status: 'playing',
          current_round: 'preflop',
          current_dealer_position: players[dealerPosition].position,
          pot: 0,
          current_bet: tableData.big_blind,
          active_position: players[firstToActPosition].position
        })
        .eq('id', tableId);
      
      // Update player roles and deal cards
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const isDealer = i === dealerPosition;
        const isSmallBlind = i === sbPosition;
        const isBigBlind = i === bbPosition;
        const isTurn = i === firstToActPosition;
        
        // Deduct blinds
        let currentBet = 0;
        let deduction = 0;
        
        if (isSmallBlind) {
          currentBet = tableData.small_blind;
          deduction = tableData.small_blind;
        } else if (isBigBlind) {
          currentBet = tableData.big_blind;
          deduction = tableData.big_blind;
        }
        
        // Get player's current chips
        const { data: playerData } = await supabase
          .from('table_players')
          .select('chips')
          .eq('table_id', tableId)
          .eq('user_id', player.user_id)
          .single();
        
        if (!playerData) continue;
        
        // Deal two cards to the player using their position for consistency
        const cards = dealCards(player.position, tableId);
        
        // Serialize cards for JSON storage
        const serializableCards = cards.map(card => ({
          suit: card.suit,
          rank: card.rank,
          faceUp: card.faceUp
        })) as unknown as Json;
        
        // Update player state
        await supabase
          .from('table_players')
          .update({
            is_dealer: isDealer,
            is_small_blind: isSmallBlind,
            is_big_blind: isBigBlind,
            is_turn: isTurn,
            is_folded: false,
            is_all_in: false,
            current_bet: currentBet,
            chips: playerData.chips - deduction,
            cards: serializableCards
          })
          .eq('table_id', tableId)
          .eq('user_id', player.user_id);
      }
      
      // Update pot with blinds
      await supabase
        .from('poker_tables')
        .update({
          pot: tableData.small_blind + tableData.big_blind
        })
        .eq('id', tableId);
      
      // Start the turn timer
      startTurnTimer();
      
      toast({
        title: "Game started",
        description: "The poker game has begun!",
      });
    } catch (error: any) {
      console.error('Error starting game:', error);
      toast({
        title: "Failed to start game",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const clearCommunityCards = async () => {
    try {
      await supabase
        .from('community_cards')
        .delete()
        .eq('table_id', tableId);
    } catch (error) {
      console.error('Error clearing community cards:', error);
    }
  };

  const startTurnTimer = async () => {
    try {
      console.log("Turn timer would start (30 seconds)");
      // In a real implementation, you would manage this with server-side logic
    } catch (error) {
      console.error('Error starting turn timer:', error);
    }
  };

  return {
    checkAndStartGame,
    startGame,
    dealCards,
    startTurnTimer,
    clearCommunityCards
  };
};
