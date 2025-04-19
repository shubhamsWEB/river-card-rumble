
import { useTurnManager } from "./useTurnManager";

interface GameRoundActions {
  advanceGameRound: (currentRound: string) => Promise<void>;
  handleShowdown: () => Promise<void>;
}

export const usePlayerTurns = (tableId: string, { advanceGameRound, handleShowdown }: GameRoundActions) => {
  // Create turn manager without direct timer initialization
  const { 
    setNextPlayerToAct,
    startTurnTimer, 
    cancelTurnTimer, 
    secondsLeft, 
    isTimerRunning 
  } = useTurnManager({ tableId, advanceGameRound, handleShowdown });

  return {
    setNextPlayerToAct,
    startTurnTimer,
    cancelTurnTimer,
    secondsLeft,
    isTimerRunning,
    handleShowdown
  };
};
