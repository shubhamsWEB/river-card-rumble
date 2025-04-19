
import { supabase } from "@/integrations/supabase/client";

interface RpcResponse {
  data: any;
  error: Error | null;
}

export const useRpcFunctions = () => {
  const addChipsToProfile = async (userId: string, amount: number): Promise<RpcResponse> => {
    try {
      const { data, error } = await supabase.rpc('add_chips', {
        p_user_id: userId,
        p_amount: amount
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error adding chips to profile:', error);
      return { data: null, error };
    }
  };

  return {
    addChipsToProfile
  };
};
