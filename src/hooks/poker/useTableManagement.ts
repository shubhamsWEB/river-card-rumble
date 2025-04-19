
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { useRpcFunctions } from "./useRpcFunctions";

export const useTableManagement = (tableId: string) => {
  const { user } = useAuth();
  const { addChipsToProfile } = useRpcFunctions(tableId);

  const handleLeaveTable = async (): Promise<void> => {
    try {
      if (!user) {
        throw new Error("You must be logged in to leave the table");
      }
      
      const { data: playerData, error: playerError } = await supabase
        .from('table_players')
        .select('chips')
        .eq('table_id', tableId)
        .eq('user_id', user.id)
        .single();
      
      if (playerError) {
        if (playerError.code === 'PGRST116') {
          toast({
            title: "Not at table",
            description: "You're not currently at this table.",
            variant: "default"
          });
          return;
        }
        throw playerError;
      }
      
      const currentChips = playerData?.chips || 0;
      
      const { error: leaveError } = await supabase
        .from('table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('user_id', user.id);
      
      if (leaveError) throw leaveError;
      
      try {
        await addChipsToProfile(user.id, currentChips);
      } catch (error) {
        console.error('Error adding chips to profile:', error);
      }
      
      toast({
        title: "Left table",
        description: `You have left the table with $${currentChips} chips`,
      });
    } catch (error: any) {
      console.error('Error leaving table:', error);
      toast({
        title: "Failed to leave table",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const checkPlayerAtTable = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('table_players')
        .select('id')
        .eq('table_id', tableId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      return !!data;
    } catch (error) {
      console.error('Error checking if player is at table:', error);
      return false;
    }
  };

  return {
    handleLeaveTable,
    checkPlayerAtTable
  };
};
