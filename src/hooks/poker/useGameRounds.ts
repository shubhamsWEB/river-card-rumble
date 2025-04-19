
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
      console.log(`Advancing from round: ${currentRound}`);
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
            return; // No need to continue after showdown
          }
          break;
        default:
          console.log(`Unknown round: ${currentRound}`);
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
            current_bet: 0
          })
          .eq('table_id', tableId);
        
        // Find dealer position to determine who acts first in the new round
        const { data: tableData } = await supabase
          .from('poker_tables')
          .select('current_dealer_position')
          .eq('id', tableId)
          .single();
        
        if (tableData && tableData.current_dealer_position !== null) {
          // Find the first active player after the dealer
          const { data: players } = await supabase
            .from('table_players')
            .select('position, is_folded, is_all_in')
            .eq('table_id', tableId)
            .order('position', { ascending: true });
          
          if (players && players.length > 0) {
            // Find the first eligible player after the dealer
            const sortedPlayers = [...players].sort((a, b) => a.position - b.position);
            let firstPlayerIndex = -1;
            
            for (let i = 0; i < sortedPlayers.length; i++) {
              if (sortedPlayers[i].position > tableData.current_dealer_position && 
                  !sortedPlayers[i].is_folded && 
                  !sortedPlayers[i].is_all_in) {
                firstPlayerIndex = i;
                break;
              }
            }
            
            // If no eligible player found after dealer, start from beginning
            if (firstPlayerIndex === -1) {
              for (let i = 0; i < sortedPlayers.length; i++) {
                if (!sortedPlayers[i].is_folded && !sortedPlayers[i].is_all_in) {
                  firstPlayerIndex = i;
                  break;
                }
              }
            }
            
            if (firstPlayerIndex !== -1) {
              const firstActivePlayer = sortedPlayers[firstPlayerIndex];
              
              // Update turn status
              await supabase
                .from('table_players')
                .update({ is_turn: false })
                .eq('table_id', tableId);
              
              await supabase
                .from('table_players')
                .update({ is_turn: true })
                .eq('table_id', tableId)
                .eq('position', firstActivePlayer.position);
              
              // Update active position
              await supabase
                .from('poker_tables')
                .update({ active_position: firstActivePlayer.position })
                .eq('id', tableId);
            }
          }
        }
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
