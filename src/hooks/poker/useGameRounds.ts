
import { supabase } from "@/integrations/supabase/client";

interface CardDealingActions {
  dealFlop: () => Promise<void>;
  dealTurn: () => Promise<void>;
  dealRiver: () => Promise<void>;
  handleShowdown: (() => Promise<void>) | null;
}

export const useGameRounds = (tableId: string, actions: CardDealingActions) => {
  const advanceGameRound = async (currentRound: string) => {
    try {
      let nextRound: string;
      switch (currentRound) {
        case 'preflop':
          nextRound = 'flop';
          await actions.dealFlop();
          break;
        case 'flop':
          nextRound = 'turn';
          await actions.dealTurn();
          break;
        case 'turn':
          nextRound = 'river';
          await actions.dealRiver();
          break;
        case 'river':
          nextRound = 'showdown';
          if (actions.handleShowdown) {
            await actions.handleShowdown();
          }
          break;
        default:
          return;
      }
      
      // Update table to next round
      await supabase
        .from('poker_tables')
        .update({
          current_round: nextRound,
          current_bet: 0
        })
        .eq('id', tableId);
      
      // Reset player bets for new betting round
      if (nextRound !== 'showdown') {
        await supabase
          .from('table_players')
          .update({
            current_bet: 0
          })
          .eq('table_id', tableId);
      }
    } catch (error) {
      console.error('Error advancing game round:', error);
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
