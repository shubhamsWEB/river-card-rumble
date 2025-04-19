
import { supabase } from "@/integrations/supabase/client";

export const useFoldingAction = (tableId: string) => {
  const processFoldAction = async (playerData: any) => {
    try {
      await supabase
        .from('table_players')
        .update({
          is_folded: true,
          is_turn: false
        })
        .eq('table_id', tableId);

      return { success: true };
    } catch (error: any) {
      console.error("Error processing fold action:", error);
      return { success: false, error: error.message };
    }
  };

  return { processFoldAction };
};
