
import { supabase } from "@/integrations/supabase/client";

export const useShowdown = (tableId: string) => {
  const handleShowdown = async () => {
    try {
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, chips, position')
        .eq('table_id', tableId)
        .eq('is_folded', false);
      
      if (playersError) throw playersError;
      if (!players || players.length === 0) return;
      
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('pot')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      const winnerIndex = Math.floor(Math.random() * players.length);
      const winner = players[winnerIndex];
      
      await supabase
        .from('table_players')
        .update({
          chips: winner.chips + tableData.pot
        })
        .eq('table_id', tableId)
        .eq('user_id', winner.user_id);
      
      const { data: winnerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', winner.user_id)
        .single();
        
      await supabase
        .from('chat_messages')
        .insert({
          table_id: tableId,
          user_id: winner.user_id,
          message: `${winnerProfile?.username || 'Player'} wins pot of $${tableData.pot}!`
        });
      
      setTimeout(async () => {
        try {
          const { count } = await supabase
            .from('table_players')
            .select('*', { count: 'exact', head: true })
            .eq('table_id', tableId);
            
          if (count !== null && count >= 2) {
            await supabase
              .from('poker_tables')
              .update({
                status: 'playing',
                current_round: 'preflop'
              })
              .eq('id', tableId);
          } else {
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
    handleShowdown
  };
};
