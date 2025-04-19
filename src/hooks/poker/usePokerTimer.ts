
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const usePokerTimer = (tableId: string) => {
  const [turnTimer, setTurnTimer] = useState<NodeJS.Timeout | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (turnTimer) {
        clearTimeout(turnTimer);
      }
    };
  }, [turnTimer]);

  const startTurnTimer = async () => {
    try {
      // Clear any existing timer
      if (turnTimer) {
        clearTimeout(turnTimer);
      }

      const TURN_DURATION = 30; // 30 seconds for turn decision
      setSecondsLeft(TURN_DURATION);
      setIsTimerRunning(true);
      
      console.log("Turn timer started (30 seconds)");
      
      // Get current player whose turn it is
      const { data: playerData } = await supabase
        .from('table_players')
        .select('user_id')
        .eq('table_id', tableId)
        .eq('is_turn', true)
        .single();
      
      // Create the timer that will auto-fold after time is up
      const timer = setTimeout(async () => {
        console.log("Turn timer expired, auto-folding");
        
        const { data: isStillTurn } = await supabase
          .from('table_players')
          .select('is_turn')
          .eq('table_id', tableId)
          .eq('user_id', playerData?.user_id)
          .single();
        
        // Only auto-fold if it's still this player's turn
        if (isStillTurn?.is_turn) {
          // Auto-fold the player
          await supabase
            .from('table_players')
            .update({
              is_folded: true,
              is_turn: false
            })
            .eq('table_id', tableId)
            .eq('user_id', playerData?.user_id);
          
          // Record the fold action
          await supabase
            .from('actions')
            .insert({
              table_id: tableId,
              user_id: playerData?.user_id,
              action_type: 'fold',
              amount: 0
            });
          
          // Add a system message to chat
          await supabase
            .from('chat_messages')
            .insert({
              table_id: tableId,
              user_id: playerData?.user_id,
              message: 'Auto-folded due to time expiration'
            });
          
          toast({
            title: "Turn expired",
            description: `Player auto-folded due to time expiration`,
            variant: "destructive"
          });
          
          setIsTimerRunning(false);
        }
      }, TURN_DURATION * 1000);
      
      setTurnTimer(timer);
    } catch (error) {
      console.error('Error starting turn timer:', error);
      setIsTimerRunning(false);
    }
  };

  const cancelTurnTimer = () => {
    if (turnTimer) {
      clearTimeout(turnTimer);
      setTurnTimer(null);
      setIsTimerRunning(false);
      console.log("Turn timer canceled");
    }
  };

  return {
    startTurnTimer,
    cancelTurnTimer,
    secondsLeft,
    isTimerRunning
  };
};
