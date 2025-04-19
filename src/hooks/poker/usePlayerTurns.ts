
import { useTurnManager } from "./useTurnManager";
import { usePokerTimer } from "./usePokerTimer";
import { useShowdown } from "./useShowdown";

interface GameRoundActions {
  advanceGameRound: (currentRound: string) => Promise<void>;
}

export const usePlayerTurns = (tableId: string, { advanceGameRound }: GameRoundActions) => {
  const { startTurnTimer } = usePokerTimer(tableId);
  const { setNextPlayerToAct } = useTurnManager({ tableId, advanceGameRound });
  const { handleShowdown } = useShowdown(tableId);

  return {
    setNextPlayerToAct,
    startTurnTimer,
    handleShowdown
  };
};
