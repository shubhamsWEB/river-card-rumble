
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const useTableActions = (tableId: string) => {
  const { user } = useAuth();
  
  const handleSendMessage = async (message: string) => {
    try {
      if (!user) {
        throw new Error("You must be logged in to send messages");
      }
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          table_id: tableId,
          user_id: user.id,
          message
        });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePlayerAction = async (action: string, amount?: number) => {
    try {
      if (!user) {
        throw new Error("You must be logged in to perform actions");
      }
      
      const { error } = await supabase
        .from('actions')
        .insert({
          table_id: tableId,
          user_id: user.id,
          action_type: action,
          amount: amount || null
        });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error performing action:', error);
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleLeaveTable = async () => {
    try {
      if (!user) {
        throw new Error("You must be logged in to leave the table");
      }
      
      // First check if the user is actually at the table
      const { data: playerData, error: playerError } = await supabase
        .from('table_players')
        .select('chips')
        .eq('table_id', tableId)
        .eq('user_id', user.id)
        .single();
      
      if (playerError) {
        if (playerError.code === 'PGRST116') {
          // Player not found at the table
          toast({
            title: "Not at table",
            description: "You're not currently at this table.",
            variant: "default"
          });
          return { success: true };
        }
        throw playerError;
      }
      
      const currentChips = playerData?.chips || 0;
      
      // Actually delete the player from the table
      const { error: leaveError } = await supabase
        .from('table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('user_id', user.id);
      
      if (leaveError) throw leaveError;
      
      // Add the chips back to the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ chips: currentChips })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Left table",
        description: `You have left the table with $${currentChips} chips`,
      });
      
      return { success: true, chips: currentChips };
    } catch (error: any) {
      console.error('Error leaving table:', error);
      toast({
        title: "Failed to leave table",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error };
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
      
      return !!data; // Returns true if the player is at the table, false otherwise
    } catch (error) {
      console.error('Error checking if player is at table:', error);
      return false;
    }
  };

  return {
    handleSendMessage,
    handlePlayerAction,
    handleLeaveTable,
    checkPlayerAtTable
  };
};
