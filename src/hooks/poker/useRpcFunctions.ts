
import { supabase } from "@/integrations/supabase/client";
import { Card, Rank, Suit } from "@/types/poker";

export const useRpcFunctions = (tableId: string) => {
  const createDeck = (): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Create deck
    const deck: Card[] = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: true });
      }
    }
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
  };

  const dealCards = (playerPosition: number): Card[] => {
    // Create and shuffle a deck
    const deck = createDeck();
    
    // Return two cards for the player
    return [
      { ...deck[0], faceUp: false },
      { ...deck[1], faceUp: false }
    ];
  };

  const dealCommunityCards = (count: number): Card[] => {
    // Create and shuffle a deck
    const deck = createDeck();
    
    // Return the requested number of cards
    return deck.slice(0, count);
  };

  // Add chips to user profile after leaving table
  const addChipsToProfile = async (userId: string, chips: number): Promise<void> => {
    try {
      // Get current chips
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('chips')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      // Update profile with new chips
      await supabase
        .from('profiles')
        .update({ chips: profileData.chips + chips })
        .eq('id', userId);
        
    } catch (error) {
      console.error('Error adding chips to profile:', error);
      throw error;
    }
  };

  return {
    dealCards,
    dealCommunityCards,
    addChipsToProfile
  };
};
