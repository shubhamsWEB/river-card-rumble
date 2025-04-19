
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const useTableActions = (tableId: string) => {
  const handleSendMessage = async (message: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          table_id: tableId,
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
      const { error } = await supabase
        .from('actions')
        .insert({
          table_id: tableId,
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
