
import { supabase } from "@/integrations/supabase/client";
import { usePokerTimer } from "./usePokerTimer";

interface TurnManagerProps {
  tableId: string;
  advanceGameRound: (currentRound: string) => Promise<void>;
  handleShowdown: () => Promise<void>;
}

export const useTurnManager = ({ tableId, advanceGameRound, handleShowdown }: TurnManagerProps) => {
  const { startTurnTimer, cancelTurnTimer, secondsLeft, isTimerRunning } = usePokerTimer(tableId);

  const setNextPlayerToAct = async () => {
    try {
      // Cancel the current turn timer when moving to next player
      cancelTurnTimer();
      
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('current_dealer_position, active_position')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, position')
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
      
      let currentActiveIndex = players.findIndex(p => p.position === tableData.active_position);
      if (currentActiveIndex === -1) {
        currentActiveIndex = players.findIndex(p => p.position === tableData.current_dealer_position);
      }
      
      const nextPlayerIndex = (currentActiveIndex + 1) % players.length;
      const activePosition = players[nextPlayerIndex].position;
      
      const { data: playersWithBets, error: betsError } = await supabase
        .from('table_players')
        .select('current_bet, is_all_in, is_folded')
        .eq('table_id', tableId);
        
      if (betsError) throw betsError;
      
      const activePlayers = playersWithBets?.filter(p => !p.is_folded) || [];
      if (activePlayers.length <= 1) {
        await handleShowdown();
        return;
      }
      
      const allBetsEqual = activePlayers.every((p, _, arr) => 
        p.is_all_in || p.current_bet === arr[0].current_bet
      );
      
      if (allBetsEqual && nextPlayerIndex === 0) {
        const { data: currentRoundData } = await supabase
          .from('poker_tables')
          .select('current_round')
          .eq('id', tableId)
          .single();
          
        if (currentRoundData) {
          await advanceGameRound(currentRoundData.current_round);
          return;
        }
      }
      
      await supabase
        .from('table_players')
        .update({ is_turn: false })
        .eq('table_id', tableId);
      
      await supabase
        .from('table_players')
        .update({ is_turn: true })
        .eq('table_id', tableId)
        .eq('position', activePosition);
      
      await supabase
        .from('poker_tables')
        .update({ active_position: activePosition })
        .eq('id', tableId);
        
      // Start turn timer for the new player
      startTurnTimer();
    } catch (error) {
      console.error('Error setting next player to act:', error);
    }
  };

  return {
    setNextPlayerToAct,
    startTurnTimer,
    cancelTurnTimer,
    secondsLeft,
    isTimerRunning
  };
};
