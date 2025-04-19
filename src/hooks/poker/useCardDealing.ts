
import { supabase } from "@/integrations/supabase/client";
import { Card, Rank, Suit } from "@/types/poker";

export const useCardDealing = (tableId: string) => {
  // Fixed seed for consistent deck generation across all players
  const createDeck = (seed: string = tableId): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Create deck
    const deck: Card[] = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: true });
      }
    }
    
    // Seeded shuffle
    const seedRandom = (str: string) => {
      let h = 1779033703 ^ str.length;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
      }
      return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
      };
    };
    
    const random = seedRandom(seed);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() / 4294967296 * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
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

  const dealFlop = async () => {
    try {
      console.log("Dealing flop...");
      // Use table ID as seed for deterministic card dealing
      const deck = createDeck(tableId);
      
      // Insert first 3 cards for flop
      const cardsToInsert = [];
      for (let i = 0; i < 3; i++) {
        cardsToInsert.push({
          table_id: tableId,
          card_index: i,
          suit: deck[i].suit,
          rank: deck[i].rank
        });
      }
      
      await supabase.from('community_cards').insert(cardsToInsert);
      return true;
    } catch (error) {
      console.error('Error dealing flop:', error);
      return false;
    }
  };

  const dealTurn = async () => {
    try {
      console.log("Dealing turn...");
      // Use table ID as seed for deterministic card dealing
      const deck = createDeck(tableId);
      
      // Insert 4th card (turn)
      await supabase
        .from('community_cards')
        .insert({
          table_id: tableId,
          card_index: 3,
          suit: deck[3].suit,
          rank: deck[3].rank
        });
      return true;
    } catch (error) {
      console.error('Error dealing turn:', error);
      return false;
    }
  };

  const dealRiver = async () => {
    try {
      console.log("Dealing river...");
      // Use table ID as seed for deterministic card dealing
      const deck = createDeck(tableId);
      
      // Insert 5th card (river)
      await supabase
        .from('community_cards')
        .insert({
          table_id: tableId,
          card_index: 4,
          suit: deck[4].suit,
          rank: deck[4].rank
        });
      return true;
    } catch (error) {
      console.error('Error dealing river:', error);
      return false;
    }
  };

  return {
    dealFlop,
    dealTurn,
    dealRiver,
    clearCommunityCards,
    createDeck
  };
};
