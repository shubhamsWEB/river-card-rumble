import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Rank, Suit, PlayerAction, SerializableCard, Json } from "@/types/poker";

export const useTableActions = (tableId: string) => {
  const { user } = useAuth();
  
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
      let tableBet = action === 'raise' || action === 'bet' ? amount as number : tableData.current_bet;
      
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

  const handleLeaveTable = async () => {
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
          return { success: true };
        }
        throw playerError;
      }
      
      const currentChips = playerData?.chips || 0;
      
      // Actually delete the player from the table
      const { error: leaveError } = await supabase
        .from('table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('user_id', user.id);
      
      if (leaveError) throw leaveError;
      
      // Add the chips back to the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ chips: currentChips })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Left table",
        description: `You have left the table with $${currentChips} chips`,
      });
      
      return { success: true, chips: currentChips };
    } catch (error: any) {
      console.error('Error leaving table:', error);
      toast({
        title: "Failed to leave table",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error };
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
      
      return !!data; // Returns true if the player is at the table, false otherwise
    } catch (error) {
      console.error('Error checking if player is at table:', error);
      return false;
    }
  };

  const checkAndStartGame = async () => {
    try {
      // Get table info
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('status, current_dealer_position')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Only proceed if table is in waiting status
      if (tableData.status !== 'waiting') {
        return;
      }
      
      // Count players at the table
      const { count, error: countError } = await supabase
        .from('table_players')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', tableId);
      
      if (countError) throw countError;
      
      // Start game if 2 or more players have joined
      if (count !== null && count >= 2) {
        await startGame();
      }
    } catch (error: any) {
      console.error('Error checking if game should start:', error);
    }
  };

  const startGame = async () => {
    try {
      // Get players at the table
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, position')
        .eq('table_id', tableId)
        .order('position', { ascending: true });
      
      if (playersError) throw playersError;
      
      if (!players || players.length < 2) {
        return;
      }
      
      // Get table info
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('small_blind, big_blind')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Determine dealer position (randomly choose first player if no dealer yet)
      const dealerPosition = Math.floor(Math.random() * players.length);
      
      // Calculate small blind and big blind positions
      const numPlayers = players.length;
      const sbPosition = (dealerPosition + 1) % numPlayers;
      const bbPosition = (dealerPosition + 2) % numPlayers;
      const firstToActPosition = (bbPosition + 1) % numPlayers;
      
      // Clear any previous game state
      await clearCommunityCards();
      
      // Update table status to playing
      await supabase
        .from('poker_tables')
        .update({
          status: 'playing',
          current_round: 'preflop',
          current_dealer_position: players[dealerPosition].position,
          pot: 0,
          current_bet: tableData.big_blind,
          active_position: players[firstToActPosition].position
        })
        .eq('id', tableId);
      
      // Update player roles and deal cards
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const isDealer = i === dealerPosition;
        const isSmallBlind = i === sbPosition;
        const isBigBlind = i === bbPosition;
        const isTurn = i === firstToActPosition;
        
        // Deduct blinds
        let currentBet = 0;
        let deduction = 0;
        
        if (isSmallBlind) {
          currentBet = tableData.small_blind;
          deduction = tableData.small_blind;
        } else if (isBigBlind) {
          currentBet = tableData.big_blind;
          deduction = tableData.big_blind;
        }
        
        // Get player's current chips
        const { data: playerData } = await supabase
          .from('table_players')
          .select('chips')
          .eq('table_id', tableId)
          .eq('user_id', player.user_id)
          .single();
        
        if (!playerData) continue;
        
        // Deal two random cards to the player
        const cards = dealCards();
        
        // Serialize cards for JSON storage - cast to a type that Supabase can handle
        const serializableCards = cards.map(card => ({
          suit: card.suit,
          rank: card.rank,
          faceUp: card.faceUp
        })) as unknown as Json;
        
        // Update player state
        await supabase
          .from('table_players')
          .update({
            is_dealer: isDealer,
            is_small_blind: isSmallBlind,
            is_big_blind: isBigBlind,
            is_turn: isTurn,
            is_folded: false,
            is_all_in: false,
            current_bet: currentBet,
            chips: playerData.chips - deduction,
            cards: serializableCards
          })
          .eq('table_id', tableId)
          .eq('user_id', player.user_id);
      }
      
      // Update pot with blinds
      await supabase
        .from('poker_tables')
        .update({
          pot: tableData.small_blind + tableData.big_blind
        })
        .eq('id', tableId);
      
      // Start the turn timer
      startTurnTimer();
      
      toast({
        title: "Game started",
        description: "The poker game has begun!",
      });
    } catch (error: any) {
      console.error('Error starting game:', error);
      toast({
        title: "Failed to start game",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const clearCommunityCards = async () => {
    try {
      await supabase
        .from('community_cards')
        .delete()
        .eq('table_id', tableId);
    } catch (error) {
      console.error('Error clearing community cards:', error);
    }
  };

  const dealCards = (): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Create deck
    const deck: Card[] = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: false });
      }
    }
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // Deal two cards
    return [deck[0], deck[1]];
  };

  const startTurnTimer = async () => {
    try {
      // In a real implementation, you would manage this with server-side logic
      // For this example, we'll set a 30-second timeout to auto-fold if no action taken
      
      // Here you would typically set up a WebSocket or polling mechanism to monitor
      // the turn timer, but for simplicity, we'll just log that the timer would be started
      console.log("Turn timer would start (30 seconds)");
      
      // In a complete implementation, you would have server-side logic that would
      // automatically fold the player or take another default action after the timer expires
    } catch (error) {
      console.error('Error starting turn timer:', error);
    }
  };

  const advanceGameRound = async (currentRound: string) => {
    try {
      let nextRound: string;
      switch (currentRound) {
        case 'preflop':
          nextRound = 'flop';
          await dealFlop();
          break;
        case 'flop':
          nextRound = 'turn';
          await dealTurn();
          break;
        case 'turn':
          nextRound = 'river';
          await dealRiver();
          break;
        case 'river':
          nextRound = 'showdown';
          await handleShowdown();
          break;
        default:
          return;
      }
      
      // Update table to next round
      await supabase
        .from('poker_tables')
        .update({
          current_round: nextRound,
          current_bet: 0
        })
        .eq('id', tableId);
      
      // Reset player bets for new betting round
      if (nextRound !== 'showdown') {
        await supabase
          .from('table_players')
          .update({
            current_bet: 0
          })
          .eq('table_id', tableId);
          
        // Set next player to act (typically starting with player after dealer)
        await setNextPlayerToAct();
      }
    } catch (error) {
      console.error('Error advancing game round:', error);
    }
  };

  const setNextPlayerToAct = async () => {
    try {
      // Get table info
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('current_dealer_position, active_position')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Get active players (not folded)
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, position')
        .eq('table_id', tableId)
        .eq('is_folded', false)
        .order('position', { ascending: true });
      
      if (playersError) throw playersError;
      
      if (!players || players.length < 2) {
        if (players && players.length === 1) {
          // Only one player left, they win by default
          await handleShowdown();
        }
        return;
      }
      
      // Find current active player index
      let currentActiveIndex = players.findIndex(p => p.position === tableData.active_position);
      if (currentActiveIndex === -1) {
        // If no active position or not found, use dealer position
        currentActiveIndex = players.findIndex(p => p.position === tableData.current_dealer_position);
      }
      
      // Next player after current active player
      const nextPlayerIndex = (currentActiveIndex + 1) % players.length;
      const activePosition = players[nextPlayerIndex].position;
      
      // Check if betting round is complete
      const { data: playersWithBets, error: betsError } = await supabase
        .from('table_players')
        .select('current_bet, is_all_in, is_folded')
        .eq('table_id', tableId);
        
      if (betsError) throw betsError;
      
      const activePlayers = playersWithBets?.filter(p => !p.is_folded) || [];
      if (activePlayers.length <= 1) {
        // Only one player left, they win by default
        await handleShowdown();
        return;
      }
      
      const allBetsEqual = activePlayers.every((p, _, arr) => 
        p.is_all_in || p.current_bet === arr[0].current_bet
      );
      
      if (allBetsEqual && nextPlayerIndex === 0) {
        // Betting round is complete, advance to next round
        const { data: currentRoundData } = await supabase
          .from('poker_tables')
          .select('current_round')
          .eq('id', tableId)
          .single();
          
        if (currentRoundData) {
          await advanceGameRound(currentRoundData.current_round);
          return;
        }
      }
      
      // Clear all turn flags
      await supabase
        .from('table_players')
        .update({ is_turn: false })
        .eq('table_id', tableId);
      
      // Set active player's turn flag
      await supabase
        .from('table_players')
        .update({ is_turn: true })
        .eq('table_id', tableId)
        .eq('position', activePosition);
      
      // Update table's active position
      await supabase
        .from('poker_tables')
        .update({ active_position: activePosition })
        .eq('id', tableId);
        
      // Start turn timer for the new active player
      startTurnTimer();
    } catch (error) {
      console.error('Error setting next player to act:', error);
    }
  };

  const dealFlop = async () => {
    try {
      const cards = dealCommunityCards(3);
      
      for (let i = 0; i < 3; i++) {
        await supabase
          .from('community_cards')
          .insert({
            table_id: tableId,
            card_index: i,
            suit: cards[i].suit,
            rank: cards[i].rank
          });
      }
    } catch (error) {
      console.error('Error dealing flop:', error);
    }
  };

  const dealTurn = async () => {
    try {
      const cards = dealCommunityCards(1);
      
      await supabase
        .from('community_cards')
        .insert({
          table_id: tableId,
          card_index: 3,
          suit: cards[0].suit,
          rank: cards[0].rank
        });
    } catch (error) {
      console.error('Error dealing turn:', error);
    }
  };

  const dealRiver = async () => {
    try {
      const cards = dealCommunityCards(1);
      
      await supabase
        .from('community_cards')
        .insert({
          table_id: tableId,
          card_index: 4,
          suit: cards[0].suit,
          rank: cards[0].rank
        });
    } catch (error) {
      console.error('Error dealing river:', error);
    }
  };

  const dealCommunityCards = (count: number): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    // Create deck
    const deck: Card[] = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: true });
      }
    }
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // Return the requested number of cards
    return deck.slice(0, count);
  };

  const handleShowdown = async () => {
    try {
      // In a real implementation, this would evaluate all hands and determine the winner
      // For this example, we'll just pick a winner randomly from the active players
      
      // Get active players
      const { data: players, error: playersError } = await supabase
        .from('table_players')
        .select('user_id, chips, position')
        .eq('table_id', tableId)
        .eq('is_folded', false);
      
      if (playersError) throw playersError;
      
      if (!players || players.length === 0) {
        return;
      }
      
      // Get table info for pot amount
      const { data: tableData, error: tableError } = await supabase
        .from('poker_tables')
        .select('pot')
        .eq('id', tableId)
        .single();
      
      if (tableError) throw tableError;
      
      // Pick random winner for demo
      // In a real implementation, you would evaluate player hands
      const winnerIndex = Math.floor(Math.random() * players.length);
      const winner = players[winnerIndex];
      
      // Award pot to winner
      await supabase
        .from('table_players')
        .update({
          chips: winner.chips + tableData.pot
        })
        .eq('table_id', tableId)
        .eq('user_id', winner.user_id);
      
      // Get winner's username
      const { data: winnerProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', winner.user_id)
        .single();
        
      // Announce winner in chat
      await supabase
        .from('chat_messages')
        .insert({
          table_id: tableId,
          user_id: winner.user_id,
          message: `${winnerProfile?.username || 'Player'} wins pot of $${tableData.pot}!`
        });
      
      // Reset game state after short delay
      setTimeout(async () => {
        try {
          // Check if enough players to continue
          const { count } = await supabase
            .from('table_players')
            .select('*', { count: 'exact', head: true })
            .eq('table_id', tableId);
            
          if (count !== null && count >= 2) {
            // Start new hand
            await startGame();
          } else {
            // Not enough players, set table back to waiting
            await supabase
              .from('poker_tables')
              .update({ status: 'waiting' })
              .eq('id', tableId);
          }
        } catch (error) {
          console.error('Error starting new hand after showdown:', error);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error handling showdown:', error);
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
