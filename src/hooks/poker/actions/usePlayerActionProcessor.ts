
import { useAuth } from "@/contexts/AuthContext";
import { PlayerAction } from "@/types/poker";
import { useBettingActions } from "./useBettingActions";
import { useFoldingAction } from "./useFoldingAction";
import { useTableValidation } from "./useTableValidation";

export const usePlayerActionProcessor = (tableId: string) => {
  const { user } = useAuth();
  const { validatePlayerTurn, getTableState } = useTableValidation(tableId);
  const { processBettingAction } = useBettingActions(tableId);
  const { processFoldAction } = useFoldingAction(tableId);

  const processPlayerAction = async (action: PlayerAction, amount?: number) => {
    if (!user) return { success: false, error: "Not authenticated" };
    
    try {
      const { isValid, playerData, tableData, error } = await validatePlayerTurn();
      if (!isValid || error) throw new Error(error || "Invalid turn");
      
      switch (action) {
        case 'check':
        case 'call':
        case 'bet':
        case 'raise':
        case 'all-in':
          return await processBettingAction(action, amount, playerData, tableData);
        case 'fold':
          return await processFoldAction(playerData);
        default:
          throw new Error("Invalid action");
      }
    } catch (error: any) {
      console.error("Error processing player action:", error);
      return { success: false, error: error.message };
    }
  };

  return { processPlayerAction };
};
