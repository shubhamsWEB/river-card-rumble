
import { supabase } from "@/integrations/supabase/client";

export const useRpcFunctions = () => {
  const addChips = async (userId: string, amount: number): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('add_chips', {
        user_id: userId,
        amount
      });
      
      if (error) throw error;
      
      return data || 0;
    } catch (error) {
      console.error('Error adding chips:', error);
      return 0;
    }
  };

  return {
    addChips
  };
};
