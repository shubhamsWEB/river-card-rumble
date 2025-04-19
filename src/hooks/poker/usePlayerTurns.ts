
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
        .select('current_dealer_position, active_position, current_round, current_bet')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Get all non-folded players in position order
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, position, is_all_in, is_folded, current_bet')
        .eq('table_id', tableId)
        .order('position', { ascending: true });
      
      if (playersError) throw playersError;
      
      // Filter out folded and all-in players for turn management
      const activePlayers = (players || []).filter(p => !p.is_folded && !p.is_all_in);
      
      if (activePlayers.length < 2) {
        // If there's only one active player (or none), handle showdown
        if (activePlayers.length <= 1 && players && players.filter(p => !p.is_folded).length >= 1) {
          await handleShowdown();
        }
        return;
      }

      // Find current active player index
      let currentActiveIndex = -1;
      if (tableData.active_position !== null) {
        currentActiveIndex = activePlayers.findIndex(p => p.position === tableData.active_position);
      }
      
      // If no active player found or at the end of the list, start from the beginning
      const nextPlayerIndex = (currentActiveIndex === -1 || currentActiveIndex === activePlayers.length - 1) 
        ? 0 
        : currentActiveIndex + 1;
      
      const nextPlayer = activePlayers[nextPlayerIndex];

      // Check if betting round is complete
      const allPlayersActed = activePlayers.every(p => p.current_bet === tableData.current_bet || p.is_all_in);
      
      // If everyone has acted and bets are equal, advance to next round
      if (allPlayersActed && nextPlayerIndex === 0) {
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
        
      // Start timer for the new active player
      startTurnTimer();
      
    } catch (error) {
      console.error('Error setting next player to act:', error);
    }
  };

  return {
    setNextPlayerToAct,
    startTurnTimer,
    cancelTurnTimer
  };
};
