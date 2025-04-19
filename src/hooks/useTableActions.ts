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
      
      const { data: playerData, error: playerError } = await supabase
        .from('table_players')
        .select('chips')
        .eq('table_id', tableId)
        .eq('user_id', user.id)
        .single();
      
      if (playerError) throw playerError;
      
      const currentChips = playerData?.chips || 0;
      
      const { error: leaveError } = await supabase
        .from('table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('user_id', user.id);
      
      if (leaveError) throw leaveError;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ chips: currentChips })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
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

  return {
    handleSendMessage,
    handlePlayerAction,
    handleLeaveTable
  };
};
