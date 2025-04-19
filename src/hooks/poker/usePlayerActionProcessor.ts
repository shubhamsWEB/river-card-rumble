
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PlayerAction } from "@/types/poker";
import { toast } from "@/components/ui/use-toast";

export const usePlayerActionProcessor = (tableId: string) => {
  const { user } = useAuth();

  const processPlayerAction = async (action: PlayerAction, amount?: number) => {
    if (!user) return;
    
    try {
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('pot, current_bet, current_round')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      const { data: playerData, error: playerError } = await supabase
        .from('table_players')
        .select('chips, current_bet, is_turn')
        .eq('table_id', tableId)
        .eq('user_id', user.id)
        .single();
      
      if (playerError) throw playerError;
      if (!playerData.is_turn) {
        throw new Error("It's not your turn");
      }
      
      let newChips = playerData.chips;
      let additionalBet = 0;
      let isFolded = false;
      let isAllIn = false;
      
      // Process different actions
      switch (action) {
        case 'check':
          if (tableData.current_bet > playerData.current_bet) {
            throw new Error("Cannot check when there's an active bet");
          }
          break;
          
        case 'call':
          additionalBet = Math.min(tableData.current_bet - playerData.current_bet, playerData.chips);
          newChips -= additionalBet;
          isAllIn = newChips === 0;
          break;
          
        case 'bet':
          if (!amount || amount <= 0) throw new Error("Invalid bet amount");
          if (amount > playerData.chips) throw new Error("Not enough chips");
          
          additionalBet = amount;
          newChips -= additionalBet;
          isAllIn = newChips === 0;
          break;
          
        case 'raise':
          if (!amount || amount <= tableData.current_bet) {
            throw new Error("Raise amount must be greater than current bet");
          }
          if (amount > playerData.chips) throw new Error("Not enough chips");
          
          additionalBet = amount - playerData.current_bet;
          newChips -= additionalBet;
          isAllIn = newChips === 0;
          break;
          
        case 'fold':
          isFolded = true;
          break;
          
        case 'all-in':
          additionalBet = playerData.chips;
          newChips = 0;
          isAllIn = true;
          break;
      }
      
      const playerCurrentBet = playerData.current_bet + additionalBet;
      
      await supabase
        .from('table_players')
        .update({
          chips: newChips,
          current_bet: playerCurrentBet,
          is_folded: isFolded,
          is_all_in: isAllIn,
          is_turn: false
        })
        .eq('table_id', tableId)
        .eq('user_id', user.id);
      
      let newPot = tableData.pot + additionalBet;
      let tableBet = action === 'raise' || action === 'bet' ? (amount as number) : tableData.current_bet;
      
      await supabase
        .from('poker_tables')
        .update({
          pot: newPot,
          current_bet: tableBet
        })
        .eq('id', tableId);
      
      return { success: true };
    } catch (error: any) {
      console.error("Error processing player action:", error);
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  return {
    processPlayerAction
  };
};
