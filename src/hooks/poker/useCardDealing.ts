
import { supabase } from "@/integrations/supabase/client";
import { Card, Rank, Suit } from "@/types/poker";

export const useCardDealing = (tableId: string) => {
  const dealCommunityCards = (count: number): Card[] => {
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
    
    // Return the requested number of cards
    return deck.slice(0, count);
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
      const cards = dealCommunityCards(3);
      
      for (let i = 0; i < 3; i++) {
        await supabase
          .from('community_cards')
          .insert({
            table_id: tableId,
            card_index: i,
            suit: cards[i].suit,
            rank: cards[i].rank
          });
      }
    } catch (error) {
      console.error('Error dealing flop:', error);
    }
  };

  const dealTurn = async () => {
    try {
      const cards = dealCommunityCards(1);
      
      await supabase
        .from('community_cards')
        .insert({
          table_id: tableId,
          card_index: 3,
          suit: cards[0].suit,
          rank: cards[0].rank
        });
    } catch (error) {
      console.error('Error dealing turn:', error);
    }
  };

  const dealRiver = async () => {
    try {
      const cards = dealCommunityCards(1);
      
      await supabase
        .from('community_cards')
        .insert({
          table_id: tableId,
          card_index: 4,
          suit: cards[0].suit,
          rank: cards[0].rank
        });
    } catch (error) {
      console.error('Error dealing river:', error);
    }
  };

  return {
    dealFlop,
    dealTurn,
    dealRiver,
    clearCommunityCards,
    dealCommunityCards
  };
};
