
import { usePokerTimer } from "./usePokerTimer";
import { supabase } from "@/integrations/supabase/client";

interface GameRoundActions {
  advanceGameRound: (currentRound: string) => Promise<void>;
  handleShowdown: () => Promise<void>;
}

export const usePlayerTurns = (tableId: string, { advanceGameRound, handleShowdown }: GameRoundActions) => {
  const { 
    startTurnTimer, 
    cancelTurnTimer
  } = usePokerTimer(tableId);

  const setNextPlayerToAct = async () => {
    try {
      // Cancel the current turn timer when moving to next player
      cancelTurnTimer();
      
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('current_dealer_position, active_position, current_round')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Get all non-folded players in position order
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, position, is_all_in, current_bet')
        .eq('table_id', tableId)
        .eq('is_folded', false)
        .order('position', { ascending: true });
      
      if (playersError) throw playersError;
      
      if (!players || players.length < 2) {
        if (players && players.length === 1) {
          await handleShowdown();
        }
        return;
      }

      // Find current active player index
      let currentActiveIndex = players.findIndex(p => p.position === tableData.active_position);
      
      // If no active player found, start from dealer position
      if (currentActiveIndex === -1) {
        currentActiveIndex = players.findIndex(p => p.position > tableData.current_dealer_position) ?? 0;
      }
      
      // Get next player index
      const nextPlayerIndex = (currentActiveIndex + 1) % players.length;
      const nextPlayer = players[nextPlayerIndex];

      // Check if betting round is complete
      const { data: bettingInfo } = await supabase
        .from('table_players')
        .select('current_bet, is_folded, is_all_in')
        .eq('table_id', tableId)
        .eq('is_folded', false);

      if (!bettingInfo) return;

      const activePlayers = bettingInfo.filter(p => !p.is_folded);
      const allBetsEqual = activePlayers.every((p, _, arr) => 
        p.is_all_in || p.current_bet === arr[0].current_bet
      );

      // If we're back to the first player after dealer AND all bets are equal,
      // advance to next round
      if (allBetsEqual && nextPlayerIndex === 0) {
        if (tableData.current_round) {
          await advanceGameRound(tableData.current_round);
          return;
        }
      }

      // Update turn status for all players
      await supabase
        .from('table_players')
        .update({ is_turn: false })
        .eq('table_id', tableId);
      
      // Set turn for next player
      await supabase
        .from('table_players')
        .update({ is_turn: true })
        .eq('table_id', tableId)
        .eq('position', nextPlayer.position);
      
      // Update active position in table
      await supabase
        .from('poker_tables')
        .update({ active_position: nextPlayer.position })
        .eq('id', tableId);
        
      startTurnTimer();
      
    } catch (error) {
      console.error('Error setting next player to act:', error);
    }
  };

  return {
    setNextPlayerToAct,
    startTurnTimer,
    cancelTurnTimer,
    handleShowdown
  };
};
