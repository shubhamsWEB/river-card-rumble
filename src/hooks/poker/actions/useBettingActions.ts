
import { supabase } from "@/integrations/supabase/client";
import { PlayerAction } from "@/types/poker";
import { toast } from "@/components/ui/use-toast";

export const useBettingActions = (tableId: string) => {
  const processBettingAction = async (
    action: PlayerAction,
    amount: number | undefined,
    playerData: any,
    tableData: any
  ) => {
    try {
      let newChips = playerData.chips;
      let additionalBet = 0;
      let isAllIn = false;

      switch (action) {
        case 'check':
          if (tableData.current_bet > playerData.current_bet) {
            throw new Error("Cannot check when there's an active bet");
          }
          break;

        case 'call':
          additionalBet = Math.min(
            tableData.current_bet - playerData.current_bet,
            playerData.chips
          );
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
          is_all_in: isAllIn,
          is_turn: false
        })
        .eq('table_id', tableId);

      const newPot = tableData.pot + additionalBet;
      const tableBet = action === 'raise' || action === 'bet' ? amount : tableData.current_bet;

      await supabase
        .from('poker_tables')
        .update({
          pot: newPot,
          current_bet: tableBet
        })
        .eq('id', tableId);

      return { success: true };
    } catch (error: any) {
      console.error("Error processing betting action:", error);
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    }
  };

  return { processBettingAction };
};
