
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

export const useTableValidation = (tableId: string) => {
  const { user } = useAuth();

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

  const getTableState = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('poker_tables')
        .select('pot, current_bet, current_round')
        .eq('id', tableId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting table state:", error);
      return null;
    }
  };

  return {
    validatePlayerTurn,
    getTableState
  };
};
