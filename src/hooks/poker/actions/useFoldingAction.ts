
import { supabase } from "@/integrations/supabase/client";

export const useFoldingAction = (tableId: string) => {
  const processFoldAction = async (playerData: any) => {
    try {
      // Get the current player's user ID
      const { data: playerInfo, error: playerError } = await supabase
        .from('table_players')
        .select('user_id')
        .eq('table_id', tableId)
        .eq('is_turn', true)
        .single();
      
      if (playerError) {
        console.error("Error getting current player:", playerError);
        return { success: false, error: "Couldn't determine current player" };
      }
      
      // Mark the player as folded
      await supabase
        .from('table_players')
        .update({
          is_folded: true,
          is_turn: false
        })
        .eq('table_id', tableId)
        .eq('user_id', playerInfo.user_id);

      console.log(`Player ${playerInfo.user_id} folded`);
      return { success: true };
    } catch (error: any) {
      console.error("Error processing fold action:", error);
      return { success: false, error: error.message };
    }
  };

  return { processFoldAction };
};
