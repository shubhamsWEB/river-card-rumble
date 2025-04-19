
import { supabase } from "@/integrations/supabase/client";

export const useRpcFunctions = () => {
  const addChipsToProfile = async (userId: string, amount: number) => {
    try {
      const { data, error } = await supabase.rpc('add_chips', { 
        user_id: userId,
        amount: amount 
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding chips to profile:', error);
      throw error;
    }
  };

  return {
    addChipsToProfile
  };
};
