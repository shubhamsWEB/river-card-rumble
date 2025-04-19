
import { supabase } from "@/integrations/supabase/client";

interface GameRoundActions {
  advanceGameRound: (currentRound: string) => Promise<void>;
}

export const usePlayerTurns = (tableId: string, { advanceGameRound }: GameRoundActions) => {
  const startTurnTimer = async () => {
    try {
      // In a real implementation, you would manage this with server-side logic
      console.log("Turn timer would start (30 seconds)");
    } catch (error) {
      console.error('Error starting turn timer:', error);
    }
  };

  const setNextPlayerToAct = async () => {
    try {
      // Get table info
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('current_dealer_position, active_position')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Get active players (not folded)
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, position')
        .eq('table_id', tableId)
        .eq('is_folded', false)
        .order('position', { ascending: true });
      
      if (playersError) throw playersError;
      
      if (!players || players.length < 2) {
        if (players && players.length === 1) {
          // Only one player left, they win by default
          await handleShowdown();
        }
        return;
      }
      
      // Find current active player index
      let currentActiveIndex = players.findIndex(p => p.position === tableData.active_position);
      if (currentActiveIndex === -1) {
        // If no active position or not found, use dealer position
        currentActiveIndex = players.findIndex(p => p.position === tableData.current_dealer_position);
      }
      
      // Next player after current active player
      const nextPlayerIndex = (currentActiveIndex + 1) % players.length;
      const activePosition = players[nextPlayerIndex].position;
      
      // Check if betting round is complete
      const { data: playersWithBets, error: betsError } = await supabase
        .from('table_players')
        .select('current_bet, is_all_in, is_folded')
        .eq('table_id', tableId);
        
      if (betsError) throw betsError;
      
      const activePlayers = playersWithBets?.filter(p => !p.is_folded) || [];
      if (activePlayers.length <= 1) {
        // Only one player left, they win by default
        await handleShowdown();
        return;
      }
      
      const allBetsEqual = activePlayers.every((p, _, arr) => 
        p.is_all_in || p.current_bet === arr[0].current_bet
      );
      
      if (allBetsEqual && nextPlayerIndex === 0) {
        // Betting round is complete, advance to next round
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
      
      // Clear all turn flags
      await supabase
        .from('table_players')
        .update({ is_turn: false })
        .eq('table_id', tableId);
      
      // Set active player's turn flag
      await supabase
        .from('table_players')
        .update({ is_turn: true })
        .eq('table_id', tableId)
        .eq('position', activePosition);
      
      // Update table's active position
      await supabase
        .from('poker_tables')
        .update({ active_position: activePosition })
        .eq('id', tableId);
        
      // Start turn timer for the new active player
      startTurnTimer();
    } catch (error) {
      console.error('Error setting next player to act:', error);
    }
  };

  const handleShowdown = async () => {
    try {
      // Get active players
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, chips, position')
        .eq('table_id', tableId)
        .eq('is_folded', false);
      
      if (playersError) throw playersError;
      
      if (!players || players.length === 0) {
        return;
      }
      
      // Get table info for pot amount
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('pot')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Pick random winner for demo
      const winnerIndex = Math.floor(Math.random() * players.length);
      const winner = players[winnerIndex];
      
      // Award pot to winner
      await supabase
        .from('table_players')
        .update({
          chips: winner.chips + tableData.pot
        })
        .eq('table_id', tableId)
        .eq('user_id', winner.user_id);
      
      // Get winner's username
      const { data: winnerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', winner.user_id)
        .single();
        
      // Announce winner in chat
      await supabase
        .from('chat_messages')
        .insert({
          table_id: tableId,
          user_id: winner.user_id,
          message: `${winnerProfile?.username || 'Player'} wins pot of $${tableData.pot}!`
        });
      
      // Reset game state after short delay
      setTimeout(async () => {
        try {
          // Check if enough players to continue
          const { count } = await supabase
            .from('table_players')
            .select('*', { count: 'exact', head: true })
            .eq('table_id', tableId);
            
          if (count !== null && count >= 2) {
            // Import and use startGame function
            const { startGame } = await import('../useGameStartup').then(
              module => ({ startGame: module.useGameStartup(tableId).startGame })
            );
            await startGame();
          } else {
            // Not enough players, set table back to waiting
            await supabase
              .from('poker_tables')
              .update({ status: 'waiting' })
              .eq('id', tableId);
          }
        } catch (error) {
          console.error('Error starting new hand after showdown:', error);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error handling showdown:', error);
    }
  };

  return {
    setNextPlayerToAct,
    startTurnTimer,
    handleShowdown
  };
};
