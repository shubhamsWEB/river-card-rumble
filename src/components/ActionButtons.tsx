
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface ActionButtonsProps {
  currentBet: number;
  pot: number;
  playerChips: number;
  onAction: (action: string, amount?: number) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  currentBet, 
  pot, 
  playerChips,
  onAction 
}) => {
  const [betAmount, setBetAmount] = useState<number>(currentBet * 2);
  const [showBetSlider, setShowBetSlider] = useState<boolean>(false);

  const canCheck = currentBet === 0;
  const canCall = currentBet > 0 && playerChips >= currentBet;
  const canBet = playerChips > 0;
  const callAmount = Math.min(currentBet, playerChips);

  const handleBetConfirm = () => {
    if (betAmount > currentBet) {
      onAction('raise', betAmount);
    } else {
      onAction('bet', betAmount);
    }
    setShowBetSlider(false);
  };

  const handleBetCancel = () => {
    setShowBetSlider(false);
  };

  const sliderValue = [betAmount];
  const minBet = currentBet > 0 ? currentBet * 2 : 10;
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
              Confirm
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {canCheck && (
            <Button onClick={() => onAction('check')} variant="secondary">
              Check
            </Button>
          )}
          
          {canCall && (
            <Button onClick={() => onAction('call', callAmount)} variant="default">
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
          
          <Button onClick={() => onAction('fold')} variant="destructive">
            Fold
          </Button>
          
          {playerChips > 0 && (
            <Button onClick={() => onAction('all-in', playerChips)} variant="outline">
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
