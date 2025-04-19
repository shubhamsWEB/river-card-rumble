
import { Card, Player, PokerTable, ChatMessage } from "../types/poker";

// Mock players data
export const mockPlayers: Player[] = [
  {
    id: "p1",
    name: "You",
    chips: 1000,
    cards: [
      { suit: "hearts", rank: "A", faceUp: true },
      { suit: "diamonds", rank: "K", faceUp: true }
    ],
    isActive: true,
    isTurn: true,
    isFolded: false,
    isAllIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: true,
    currentBet: 10,
    avatar: undefined,
    position: 0
  },
  {
    id: "p2",
    name: "Player 2",
    chips: 1500,
    cards: [
      { suit: "clubs", rank: "2", faceUp: false },
      { suit: "spades", rank: "3", faceUp: false }
    ],
    isActive: true,
    isTurn: false,
    isFolded: false,
    isAllIn: false,
    isDealer: false,
    isSmallBlind: true,
    isBigBlind: false,
    currentBet: 5,
    avatar: undefined,
    position: 2
  },
  {
    id: "p3",
    name: "Player 3",
    chips: 2000,
    cards: [
      { suit: "hearts", rank: "Q", faceUp: false },
      { suit: "diamonds", rank: "J", faceUp: false }
    ],
    isActive: true,
    isTurn: false,
    isFolded: false,
    isAllIn: false,
    isDealer: true,
    isSmallBlind: false,
    isBigBlind: false,
    currentBet: 0,
    avatar: undefined,
    position: 4
  },
  {
    id: "p4",
    name: "Player 4",
    chips: 800,
    cards: [
      { suit: "clubs", rank: "9", faceUp: false },
      { suit: "spades", rank: "10", faceUp: false }
    ],
    isActive: true,
    isTurn: false,
    isFolded: false,
    isAllIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    currentBet: 0,
    avatar: undefined,
    position: 6
  },
  {
    id: "p5",
    name: "Player 5",
    chips: 1200,
    cards: [
      { suit: "hearts", rank: "7", faceUp: false },
      { suit: "diamonds", rank: "8", faceUp: false }
    ],
    isActive: true,
    isTurn: false,
    isFolded: false,
    isAllIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    currentBet: 0,
    avatar: undefined,
    position: 8
  }
];

// Mock community cards
export const mockCommunityCards: Card[] = [
  { suit: "spades", rank: "A", faceUp: true },
  { suit: "hearts", rank: "10", faceUp: true },
  { suit: "diamonds", rank: "2", faceUp: true },
  { suit: "clubs", rank: "7", faceUp: false },
  { suit: "spades", rank: "K", faceUp: false }
];

// Mock poker table
export const mockTable: PokerTable = {
  id: "table1",
  name: "High Stakes Table",
  players: mockPlayers,
  communityCards: mockCommunityCards,
  pot: 15,
  currentBet: 10,
  smallBlind: 5,
  bigBlind: 10,
  round: "flop",
  activePlayerId: "p1",
  dealerId: "p3",
  lastAction: {
    playerId: "p2",
    action: "call",
    amount: 5
  }
};

// Mock chat messages
export const mockChatMessages: ChatMessage[] = [
  {
    id: "msg1",
    playerId: "p3",
    playerName: "Player 3",
    message: "Good luck everyone!",
    timestamp: Date.now() - 300000
  },
  {
    id: "msg2",
    playerId: "p2",
    playerName: "Player 2",
    message: "Nice hand!",
    timestamp: Date.now() - 120000
  },
  {
    id: "msg3",
    playerId: "p4",
    playerName: "Player 4",
    message: "I'm all in next hand!",
    timestamp: Date.now() - 60000
  }
];

// Mock available tables
export const mockAvailableTables = [
  {
    id: "table1", 
    name: "High Stakes Table", 
    players: 5, 
    maxPlayers: 9,
    smallBlind: 5,
    bigBlind: 10
  },
  {
    id: "table2", 
    name: "Beginners Table", 
    players: 3, 
    maxPlayers: 6,
    smallBlind: 1,
    bigBlind: 2
  },
  {
    id: "table3", 
    name: "Texas Hold'em Pro", 
    players: 7, 
    maxPlayers: 9,
    smallBlind: 10,
    bigBlind: 20
  },
];
