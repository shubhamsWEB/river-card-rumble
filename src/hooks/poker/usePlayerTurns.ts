
import { supabase } from "@/integrations/supabase/client";

interface GameRoundActions {
  advanceGameRound: (currentRound: string) => Promise<void>;
  handleShowdown: () => Promise<void>;
}

export const usePlayerTurns = (tableId: string, { advanceGameRound, handleShowdown }: GameRoundActions) => {
  const setNextPlayerToAct = async () => {
    try {
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('current_dealer_position, active_position, current_round, current_bet')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Get all players in position order
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

      // Check if betting round is complete (all active players have equal bets)
      const allPlayersEqualBet = activePlayers.every(p => p.current_bet === tableData.current_bet);
      
      // If all players have equal bets and everyone has acted, the round is complete
      if (allPlayersEqualBet) {
        const allPlayersActed = activePlayers.every(p => p.current_bet === tableData.current_bet);
        
        if (allPlayersActed) {
          console.log("All players have acted with equal bets, advancing to next round");
          if (tableData.current_round) {
            await advanceGameRound(tableData.current_round);
            return;
          }
        }
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
      
      console.log(`Turn moved to player at position ${nextPlayer.position}`);
        
    } catch (error) {
      console.error('Error setting next player to act:', error);
    }
  };

  return {
    setNextPlayerToAct
  };
};
