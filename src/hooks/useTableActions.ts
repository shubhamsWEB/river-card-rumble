
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

  return {
    handleSendMessage,
    handlePlayerAction
  };
};
