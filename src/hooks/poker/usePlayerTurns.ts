
import { useTurnManager } from "./useTurnManager";
import { usePokerTimer } from "./usePokerTimer";

interface GameRoundActions {
  advanceGameRound: (currentRound: string) => Promise<void>;
  handleShowdown: () => Promise<void>;
}

export const usePlayerTurns = (tableId: string, { advanceGameRound, handleShowdown }: GameRoundActions) => {
  const { startTurnTimer, cancelTurnTimer, secondsLeft, isTimerRunning } = usePokerTimer(tableId);
  const { setNextPlayerToAct } = useTurnManager({ tableId, advanceGameRound, handleShowdown });

  return {
    setNextPlayerToAct,
    startTurnTimer,
    cancelTurnTimer,
    secondsLeft,
    isTimerRunning,
    handleShowdown
  };
};
