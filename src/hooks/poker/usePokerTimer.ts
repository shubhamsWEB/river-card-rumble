
import { supabase } from "@/integrations/supabase/client";

export const usePokerTimer = (tableId: string) => {
  const startTurnTimer = async () => {
    try {
      console.log("Turn timer would start (30 seconds)");
    } catch (error) {
      console.error('Error starting turn timer:', error);
    }
  };

  return {
    startTurnTimer
  };
};
