
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PlayerAction } from "@/types/poker";
import { useGameStartup } from "./poker/useGameStartup";
import { useCardDealing } from "./poker/useCardDealing";
import { useGameRounds } from "./poker/useGameRounds";
import { usePlayerTurns } from "./poker/usePlayerTurns";
import { useRpcFunctions } from "./poker/useRpcFunctions";

export const useTableActions = (tableId: string) => {
  const { user } = useAuth();
  const { checkAndStartGame, startGame } = useGameStartup(tableId);
  const { dealFlop, dealTurn, dealRiver } = useCardDealing(tableId);
  const { advanceGameRound, handleShowdown } = useGameRounds(tableId, { dealFlop, dealTurn, dealRiver, handleShowdown: null });
  const { setNextPlayerToAct } = usePlayerTurns(tableId, { advanceGameRound });
  const { addChipsToProfile } = useRpcFunctions();
  
  const handleSendMessage = async (message: string) => {
    try {
      if (!user) {
        throw new Error("You must be logged in to send messages");
      }
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          table_id: tableId,
          user_id: user.id,
          message
        });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePlayerAction = async (action: PlayerAction, amount?: number) => {
    try {
      if (!user) {
        throw new Error("You must be logged in to perform actions");
      }
      
      console.log(`Submitting action ${action} with amount ${amount || 'none'}`);
      
      const { error } = await supabase
        .from('actions')
        .insert({
          table_id: tableId,
          user_id: user.id,
          action_type: action,
          amount: amount || null
        });
      
      if (error) {
        console.error("Error submitting action:", error);
        throw error;
      }
      
      // Process the action server-side
      await processPlayerAction(action, amount);
      
    } catch (error: any) {
      console.error('Error performing action:', error);
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const processPlayerAction = async (action: PlayerAction, amount?: number) => {
    if (!user) return;
    
    try {
      // Get current table state
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('pot, current_bet, current_round')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Get the player's current state
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
      
      // Handle the different actions
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
      
      // Update player state
      const playerCurrentBet = playerData.current_bet + additionalBet;
      const { error: updatePlayerError } = await supabase
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
      
      if (updatePlayerError) throw updatePlayerError;
      
      // Update table
      let newPot = tableData.pot + additionalBet;
      let tableBet = action === 'raise' || action === 'bet' ? (amount as number) : tableData.current_bet;
      
      const { error: updateTableError } = await supabase
        .from('poker_tables')
        .update({
          pot: newPot,
          current_bet: tableBet
        })
        .eq('id', tableId);
      
      if (updateTableError) throw updateTableError;
      
      // Set next player's turn
      await setNextPlayerToAct();
      
    } catch (error: any) {
      console.error("Error processing player action:", error);
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleLeaveTable = async (): Promise<void> => {
    try {
      if (!user) {
        throw new Error("You must be logged in to leave the table");
      }
      
      // First check if the user is actually at the table
      const { data: playerData, error: playerError } = await supabase
        .from('table_players')
        .select('chips')
        .eq('table_id', tableId)
        .eq('user_id', user.id)
        .single();
      
      if (playerError) {
        if (playerError.code === 'PGRST116') {
          // Player not found at the table
          toast({
            title: "Not at table",
            description: "You're not currently at this table.",
            variant: "default"
          });
          return;
        }
        throw playerError;
      }
      
      const currentChips = playerData?.chips || 0;
      
      // Delete the player from the table
      const { error: leaveError } = await supabase
        .from('table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('user_id', user.id);
      
      if (leaveError) throw leaveError;
      
      // Add the chips back to the user's profile
      try {
        await addChipsToProfile(user.id, currentChips);
      } catch (error) {
        console.error('Error adding chips to profile:', error);
        // If this fails, still consider the operation successful but log the error
      }
      
      toast({
        title: "Left table",
        description: `You have left the table with $${currentChips} chips`,
      });
    } catch (error: any) {
      console.error('Error leaving table:', error);
      toast({
        title: "Failed to leave table",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const checkPlayerAtTable = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('table_players')
        .select('id')
        .eq('table_id', tableId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      return !!data;
    } catch (error) {
      console.error('Error checking if player is at table:', error);
      return false;
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
