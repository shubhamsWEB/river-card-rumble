
import { useAuth } from "@/contexts/AuthContext";
import { PlayerAction } from "@/types/poker";
import { useGameStartup } from "./poker/useGameStartup";
import { useCardDealing } from "./poker/useCardDealing";
import { useGameRounds } from "./poker/useGameRounds";
import { usePlayerTurns } from "./poker/usePlayerTurns";
import { useChatActions } from "./poker/useChatActions";
import { useTableManagement } from "./poker/useTableManagement";
import { usePlayerActionProcessor } from "./poker/actions/usePlayerActionProcessor";
import { useShowdown } from "./poker/useShowdown";

export const useTableActions = (tableId: string) => {
  const { user } = useAuth();
  
  // If tableId is empty, return empty handlers to maintain consistent hook calls
  if (!tableId) {
    return {
      handleSendMessage: async () => {},
      handlePlayerAction: async () => {},
      handleLeaveTable: async () => {},
      checkPlayerAtTable: async () => false,
      checkAndStartGame: async () => {},
      startGame: async () => {},
      advanceGameRound: async () => {},
      setNextPlayerToAct: async () => {}
    };
  }

  const { checkAndStartGame, startGame } = useGameStartup(tableId);
  const { dealFlop, dealTurn, dealRiver } = useCardDealing(tableId);
  const { handleShowdown } = useShowdown(tableId);
  const { advanceGameRound } = useGameRounds(tableId, { dealFlop, dealTurn, dealRiver, handleShowdown });
  const { setNextPlayerToAct } = usePlayerTurns(tableId, { advanceGameRound, handleShowdown });
  const { handleSendMessage } = useChatActions(tableId);
  const { handleLeaveTable, checkPlayerAtTable } = useTableManagement(tableId);
  const { processPlayerAction } = usePlayerActionProcessor(tableId);

  const handlePlayerAction = async (action: PlayerAction, amount?: number) => {
    try {
      if (!user) {
        throw new Error("You must be logged in to perform actions");
      }
      
      const result = await processPlayerAction(action, amount);
      if (result.success) {
        await setNextPlayerToAct();
      }
      
    } catch (error: any) {
      console.error('Error performing action:', error);
    }
  };

  return {
    handleSendMessage,
    handlePlayerAction,
    handleLeaveTable,
    checkPlayerAtTable,
    checkAndStartGame,
    startGame,
    advanceGameRound,
    setNextPlayerToAct
  };
};
