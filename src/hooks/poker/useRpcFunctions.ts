
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// This type allows for string parameters
export interface RpcCallParams {
  [key: string]: any;
}

export const useRpcFunctions = () => {
  const { user } = useAuth();

  const callRpcFunction = async (functionName: string, params: RpcCallParams = {}) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase.rpc(functionName, params);
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error: any) {
      console.error(`Error calling RPC function ${functionName}:`, error);
      return { data: null, error: error.message || 'Unknown error' };
    }
  };

  // Add back the specific function for adding chips for backwards compatibility
  const addChipsToProfile = async (userId: string, amount: number) => {
    return callRpcFunction('add_chips', {
      p_user_id: userId,
      p_amount: amount
    });
  };

  return { 
    callRpcFunction,
    addChipsToProfile
  };
};
