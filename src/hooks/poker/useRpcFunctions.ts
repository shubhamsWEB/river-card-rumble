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

  return {
    dealCards,
    dealCommunityCards
  };
};
