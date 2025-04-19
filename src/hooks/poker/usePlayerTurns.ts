
import { supabase } from "@/integrations/supabase/client";

interface GameRoundActions {
  advanceGameRound: (currentRound: string) => Promise<void>;
  handleShowdown: () => Promise<void>;
}

export const usePlayerTurns = (tableId: string, { advanceGameRound, handleShowdown }: GameRoundActions) => {
  const setNextPlayerToAct = async () => {
    try {
      // Get current table state
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
      
      if (!players || players.length === 0) {
        console.log("No players found at table");
        return;
      }
      
      console.log("Current table state:", { 
        round: tableData.current_round,
        currentBet: tableData.current_bet,
        activePosition: tableData.active_position 
      });
      
      // Filter out folded and all-in players
      const activePlayers = players.filter(p => !p.is_folded && !p.is_all_in);
      
      console.log(`Active players: ${activePlayers.length}`);
      activePlayers.forEach(p => console.log(`Position ${p.position}, bet: ${p.current_bet}`));
      
      // If there's only one active player left, go to showdown
      if (activePlayers.length <= 1) {
        console.log("Only one active player remaining - going to showdown");
        await handleShowdown();
        return;
      }

      // Check if betting round is complete (all active players have equal bets)
      const allBetsEqual = activePlayers.every(p => p.current_bet === tableData.current_bet);
      
      // If all bets are equal, we need to advance to the next round
      if (allBetsEqual && tableData.current_bet >= 0) {
        console.log("All bets are equal - round complete");
        
        // Check if we need to advance the round
        if (tableData.current_round) {
          console.log(`Advancing from ${tableData.current_round} to next round`);
          await advanceGameRound(tableData.current_round);
          return;
        }
      }
      
      // Get active position to find next player
      const currentPosition = tableData.active_position;
      
      // Find next eligible player to act
      let nextPlayer = null;
      const sortedPositions = [...activePlayers].sort((a, b) => a.position - b.position);
      
      // Find players with position > currentPosition
      const higherPositions = sortedPositions.filter(p => p.position > currentPosition);
      
      if (higherPositions.length > 0) {
        // Take the first player with position > currentPosition
        nextPlayer = higherPositions[0];
      } else if (sortedPositions.length > 0) {
        // Wrap around to the beginning
        nextPlayer = sortedPositions[0];
      }
      
      if (!nextPlayer) {
        console.log("No next player found");
        return;
      }
      
      console.log(`Setting next player: position ${nextPlayer.position}`);
      
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
