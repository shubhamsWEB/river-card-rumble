
import { supabase } from "@/integrations/supabase/client";

interface CardDealingActions {
  dealFlop: () => Promise<boolean>;
  dealTurn: () => Promise<boolean>;
  dealRiver: () => Promise<boolean>;
  handleShowdown: (() => Promise<void>) | null;
}

export const useGameRounds = (tableId: string, actions: CardDealingActions) => {
  const advanceGameRound = async (currentRound: string) => {
    try {
      console.log(`Advancing from round: ${currentRound}`);
      let nextRound: string;
      let success = false;
      
      switch (currentRound) {
        case 'preflop':
          nextRound = 'flop';
          // Deal the flop (3 cards) when advancing from preflop to flop
          success = await actions.dealFlop();
          break;
        case 'flop':
          nextRound = 'turn';
          // Deal the turn card (1 card) when advancing from flop to turn
          success = await actions.dealTurn();
          break;
        case 'turn':
          nextRound = 'river';
          // Deal the river card (1 card) when advancing from turn to river
          success = await actions.dealRiver();
          break;
        case 'river':
          nextRound = 'showdown';
          if (actions.handleShowdown) {
            await actions.handleShowdown();
            return; // No need to continue after showdown
          }
          break;
        default:
          console.log(`Unknown round: ${currentRound}`);
          return;
      }
      
      if (currentRound !== 'river' && !success) {
        console.error(`Failed to deal cards for ${nextRound}`);
        return;
      }
      
      console.log(`Round advanced to: ${nextRound}`);
      
      // Update table to next round
      await supabase
        .from('poker_tables')
        .update({
          current_round: nextRound,
          current_bet: 0
        })
        .eq('id', tableId);
      
      // Reset player bets for new betting round (except in showdown)
      if (nextRound !== 'showdown') {
        await supabase
          .from('table_players')
          .update({
            current_bet: 0,
            is_turn: false
          })
          .eq('table_id', tableId);
          
        await setupFirstPlayerForRound();
      }
    } catch (error) {
      console.error('Error advancing game round:', error);
    }
  };

  // Helper function to determine who acts first in a new round
  const setupFirstPlayerForRound = async () => {
    try {
      // Get dealer position
      const { data: tableData } = await supabase
        .from('poker_tables')
        .select('current_dealer_position')
        .eq('id', tableId)
        .single();
      
      if (!tableData) return;
      
      // Get all active players
      const { data: players } = await supabase
        .from('table_players')
        .select('position, is_folded, is_all_in')
        .eq('table_id', tableId)
        .eq('is_folded', false)
        .eq('is_all_in', false)
        .order('position', { ascending: true });
      
      if (!players || players.length === 0) return;
      
      // Find the first active player after the dealer
      let firstPlayerPosition = null;
      
      // First look for players after the dealer
      for (const player of players) {
        if (player.position > tableData.current_dealer_position) {
          firstPlayerPosition = player.position;
          break;
        }
      }
      
      // If no player found after dealer, wrap around to the beginning
      if (firstPlayerPosition === null && players.length > 0) {
        firstPlayerPosition = players[0].position;
      }
      
      if (firstPlayerPosition !== null) {
        // Update turn status
        await supabase
          .from('table_players')
          .update({ is_turn: true })
          .eq('table_id', tableId)
          .eq('position', firstPlayerPosition);
        
        // Update active position in table
        await supabase
          .from('poker_tables')
          .update({ active_position: firstPlayerPosition })
          .eq('id', tableId);
          
        console.log(`First player to act in new round set to position ${firstPlayerPosition}`);
      }
    } catch (error) {
      console.error('Error setting up first player for round:', error);
    }
  };

  const handleShowdown = actions.handleShowdown || (async () => {
    // Default implementation if none provided
    console.log("Default showdown handler called");
  });

  return {
    advanceGameRound,
    handleShowdown
  };
};
