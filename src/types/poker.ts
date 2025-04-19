
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PlayerAction = 'check' | 'call' | 'bet' | 'raise' | 'fold' | 'all-in';

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  isActive: boolean;
  isTurn: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  currentBet: number;
  avatar?: string;
  position: number; // 0-9 clockwise around table
}

export interface PokerTable {
  id: string;
  name: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  activePlayerId: string | null;
  dealerId: string | null;
  lastAction?: {
    playerId: string;
    action: PlayerAction;
    amount?: number;
  };
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface DbPokerTable {
  id: string;
  name: string;
  created_at: string;
  small_blind: number;
  big_blind: number;
  min_buy_in: number;
  max_buy_in: number;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished';
  current_dealer_position: number | null;
  current_round: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  pot: number;
  current_bet: number;
  active_position: number | null;
}

export interface DbTablePlayer {
  id: string;
  table_id: string;
  user_id: string;
  position: number;
  chips: number;
  current_bet: number;
  is_active: boolean;
  is_dealer: boolean;
  is_small_blind: boolean;
  is_big_blind: boolean;
  is_turn: boolean;
  is_folded: boolean;
  is_all_in: boolean;
  cards: Card[];
}

export interface DbCommunityCard {
  id: string;
  table_id: string;
  card_index: number;
  suit: Suit;
  rank: Rank;
}

export interface DbAction {
  id: string;
  table_id: string;
  user_id: string;
  action_type: PlayerAction;
  amount: number | null;
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  table_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  chips: number;
  created_at: string;
}
