
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useTableState = (tableId: string) => {
  const { user } = useAuth();

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
    getTableState
  };
};
