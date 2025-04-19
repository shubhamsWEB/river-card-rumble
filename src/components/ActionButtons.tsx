
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PlayerAction } from '@/types/poker';

interface ActionButtonsProps {
  currentBet: number;
  pot: number;
  playerChips: number;
  onAction: (action: PlayerAction, amount?: number) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  currentBet, 
  pot, 
  playerChips,
  onAction 
}) => {
  const [betAmount, setBetAmount] = useState<number>(currentBet > 0 ? currentBet * 2 : Math.min(20, playerChips));
  const [showBetSlider, setShowBetSlider] = useState<boolean>(false);

  const canCheck = currentBet === 0;
  const canCall = currentBet > 0 && playerChips >= currentBet;
  const canBet = playerChips > 0;
  const callAmount = Math.min(currentBet, playerChips);

  const handleAction = (action: PlayerAction, amount?: number) => {
    console.log(`Player action: ${action}${amount ? ` with amount: ${amount}` : ''}`);
    onAction(action, amount);
  };

  const handleBetConfirm = () => {
    const action: PlayerAction = currentBet > 0 ? 'raise' : 'bet';
    handleAction(action, betAmount);
    setShowBetSlider(false);
  };

  const handleBetCancel = () => {
    setShowBetSlider(false);
  };

  const sliderValue = [betAmount];
  const minBet = currentBet > 0 ? currentBet * 2 : Math.max(10, Math.floor(playerChips * 0.05));
  const maxBet = playerChips;

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
      {showBetSlider ? (
        <div className="bg-gray-800 p-4 rounded-lg animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm">Min: {minBet}</span>
            <span className="text-white text-sm">Max: {maxBet}</span>
          </div>
          
          <Slider 
            value={sliderValue}
            min={minBet}
            max={maxBet}
            step={5}
            className="mb-4"
            onValueChange={(value) => setBetAmount(value[0])}
          />
          
          <div className="flex items-center gap-2 mb-4">
            <Input 
              type="number" 
              value={betAmount} 
              onChange={(e) => setBetAmount(Math.min(Number(e.target.value), maxBet))}
              className="text-center"
              min={minBet}
              max={maxBet}
            />
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setBetAmount(Math.min(betAmount + 10, maxBet))}
              >
                +10
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setBetAmount(Math.min(betAmount + 50, maxBet))}
              >
                +50
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              variant="outline" 
              onClick={handleBetCancel}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-poker-gold hover:bg-yellow-600 text-black" 
              onClick={handleBetConfirm}
            >
              Confirm {currentBet > 0 ? 'Raise' : 'Bet'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {canCheck && (
            <Button onClick={() => handleAction('check')} variant="secondary">
              Check
            </Button>
          )}
          
          {canCall && (
            <Button onClick={() => handleAction('call', callAmount)} variant="default">
              Call ${callAmount}
            </Button>
          )}
          
          {canBet && (
            <Button 
              onClick={() => setShowBetSlider(true)} 
              className="bg-poker-gold hover:bg-yellow-600 text-black"
            >
              {currentBet > 0 ? `Raise` : `Bet`}
            </Button>
          )}
          
          <Button onClick={() => handleAction('fold')} variant="destructive">
            Fold
          </Button>
          
          {playerChips > 0 && (
            <Button onClick={() => handleAction('all-in', playerChips)} variant="outline">
              All-In ${playerChips}
            </Button>
          )}
        </div>
      )}
      
      <div className="text-center text-white text-sm">
        <span className="mr-4">Pot: ${pot}</span>
        <span>Current bet: ${currentBet}</span>
      </div>
    </div>
  );
};

export default ActionButtons;
