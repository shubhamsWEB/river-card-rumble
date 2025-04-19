
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useTableState } from "./useTableState";

export const useTableValidation = (tableId: string) => {
  const { user } = useAuth();
  const { getTableState } = useTableState(tableId);

  const validatePlayerTurn = async () => {
    if (!user) return { isValid: false, error: "Not authenticated" };

    try {
      const [tableResponse, playerResponse] = await Promise.all([
        supabase
          .from('poker_tables')
          .select('pot, current_bet, current_round')
          .eq('id', tableId)
          .single(),
        supabase
          .from('table_players')
          .select('chips, current_bet, is_turn')
          .eq('table_id', tableId)
          .eq('user_id', user.id)
          .single()
      ]);

      if (tableResponse.error) throw tableResponse.error;
      if (playerResponse.error) throw playerResponse.error;
      
      if (!playerResponse.data.is_turn) {
        return { isValid: false, error: "It's not your turn" };
      }

      return {
        isValid: true,
        tableData: tableResponse.data,
        playerData: playerResponse.data,
        error: null
      };
    } catch (error: any) {
      console.error("Error validating turn:", error);
      return { isValid: false, error: error.message };
    }
  };

  return {
    validatePlayerTurn,
    getTableState
  };
};
