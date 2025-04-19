
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TablesList from "@/components/TablesList";
import { useAuth } from "@/contexts/AuthContext";
import { DbPokerTable } from "@/types/poker";
import { Loader2, Users, LogOut } from "lucide-react";
import { useTableActions } from "@/hooks/useTableActions";

interface HomeViewProps {
  onJoinTable: (tableId: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onJoinTable }) => {
  const { user, profile, signOut } = useAuth();
  
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(false);
  const [buyInAmount, setBuyInAmount] = useState<number>(1000);
  const [tables, setTables] = useState<DbPokerTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [tableName, setTableName] = useState<string>("");
  const [smallBlind, setSmallBlind] = useState<number>(5);
  const [bigBlind, setBigBlind] = useState<number>(10);
  const [minBuyIn, setMinBuyIn] = useState<number>(500);
  const [maxBuyIn, setMaxBuyIn] = useState<number>(2000);
  const [maxPlayers, setMaxPlayers] = useState<number>(9);
  
  const [availablePositions, setAvailablePositions] = useState<number[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);
  
  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('poker_tables')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const typedTables = (data || []).map(table => ({
        ...table,
        status: table.status as "waiting" | "playing" | "finished",
        current_round: (table.current_round as "preflop" | "flop" | "turn" | "river" | "showdown") || "preflop"
      }));
      
      setTables(typedTables);
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Error loading tables",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJoinTable = async (tableId: string) => {
    setSelectedTableId(tableId);
    
    if (user) {
      setIsLoading(true);
      
      try {
        const { data: existingPlayer } = await supabase
          .from('table_players')
          .select('id')
          .eq('table_id', tableId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existingPlayer) {
          onJoinTable(tableId);
          
          toast({
            title: "Rejoining table",
            description: "You are already seated at this table",
          });
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error checking if player is at table:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    setShowJoinDialog(true);
    
    const table = tables.find(t => t.id === tableId);
    if (table) {
      setBuyInAmount(table.min_buy_in);
      
      const { data: existingPlayers } = await supabase
        .from('table_players')
        .select('position')
        .eq('table_id', tableId);
      
      const takenPositions = new Set(existingPlayers?.map(p => p.position) || []);
      const availablePos = Array.from({length: table.max_players}, (_, i) => i)
        .filter(pos => !takenPositions.has(pos));
      
      setAvailablePositions(availablePos);
      setSelectedPosition(availablePos[0] || null);
    }
  };
  
  const handleSubmitJoin = async () => {
    if (!selectedTableId || !user || selectedPosition === null) return;
    
    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;
    
    if (buyInAmount < table.min_buy_in || buyInAmount > table.max_buy_in) {
      toast({
        title: "Invalid buy-in amount",
        description: `Buy-in must be between $${table.min_buy_in} and $${table.max_buy_in}`,
        variant: "destructive"
      });
      return;
    }
    
    if (profile && buyInAmount > profile.chips) {
      toast({
        title: "Insufficient chips",
        description: `You only have $${profile.chips} chips`,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data: existingPlayer } = await supabase
        .from('table_players')
        .select('id')
        .eq('table_id', selectedTableId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingPlayer) {
        onJoinTable(selectedTableId);
        setShowJoinDialog(false);
        
        toast({
          title: "Already at table",
          description: "You are already seated at this table",
        });
        setIsLoading(false);
        return;
      }
      
      const { error: joinError } = await supabase
        .from('table_players')
        .insert({
          table_id: selectedTableId,
          user_id: user.id,
          position: selectedPosition,
          chips: buyInAmount,
          cards: null
        });
      
      if (joinError) throw joinError;
      
      if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ chips: profile.chips - buyInAmount })
          .eq('id', user.id);
        
        if (updateError) throw updateError;
      }
      
      onJoinTable(selectedTableId);
      setShowJoinDialog(false);
      
      const tableActions = useTableActions(selectedTableId);
      if (tableActions) {
        tableActions.checkAndStartGame();
      }
      
      toast({
        title: "Joined table",
        description: `You have joined ${table.name} with $${buyInAmount} chips`,
      });
    } catch (error: any) {
      console.error('Error joining table:', error);
      toast({
        title: "Failed to join table",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateNewTable = async () => {
    if (!tableName) {
      toast({
        title: "Table name required",
        description: "Please enter a name for your table",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('poker_tables')
        .insert({
          name: tableName,
          small_blind: smallBlind,
          big_blind: bigBlind,
          min_buy_in: minBuyIn,
          max_buy_in: maxBuyIn,
          max_players: maxPlayers
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSelectedTableId(data.id);
      setBuyInAmount(minBuyIn);
      handleSubmitJoin();
      
      toast({
        title: "Table created",
        description: `${tableName} has been created`,
      });
    } catch (error: any) {
      console.error('Error creating table:', error);
      toast({
        title: "Failed to create table",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 p-4 flex items-center justify-between">
        <h1 className="text-white font-bold text-3xl">River Card Rumble</h1>
        <div className="flex items-center gap-4">
          <div className="bg-gray-700 px-3 py-1.5 rounded-md flex items-center gap-2">
            <span className="text-poker-gold font-medium">${profile?.chips || 0}</span>
            <span className="text-white">chips</span>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-6">
        <Tabs defaultValue="tables" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6">
            <TabsTrigger value="tables">Join a Table</TabsTrigger>
            <TabsTrigger value="create">Create a Table</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tables">
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white text-xl font-semibold">Available Tables</h2>
                <div className="flex gap-4">
                  <Button variant="outline" size="sm" onClick={fetchTables}>
                    Refresh
                  </Button>
                  <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-md">
                    <Users size={16} className="text-blue-400" />
                    <span className="text-white">{tables.length} Tables Available</span>
                  </div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              ) : tables.length > 0 ? (
                <TablesList tables={tables} onJoinTable={handleJoinTable} />
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <p>No tables available. Create your own!</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="create">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Create New Table</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Table Name</label>
                  <Input 
                    placeholder="My Poker Table" 
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Small Blind</label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={smallBlind}
                      onChange={(e) => setSmallBlind(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Big Blind</label>
                    <Input 
                      type="number" 
                      min="2" 
                      value={bigBlind}
                      onChange={(e) => setBigBlind(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Min Buy-in</label>
                    <Input 
                      type="number" 
                      min="100" 
                      value={minBuyIn}
                      onChange={(e) => setMinBuyIn(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Max Buy-in</label>
                    <Input 
                      type="number" 
                      min="100" 
                      value={maxBuyIn}
                      onChange={(e) => setMaxBuyIn(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Max Players</label>
                  <Input 
                    type="number" 
                    min="2" 
                    max="9" 
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={handleCreateNewTable}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : 'Create Table'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Table</DialogTitle>
            <DialogDescription>
              Select a position and enter your buy-in amount to join this poker table.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm">Select Position</label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={selectedPosition || ''}
                onChange={(e) => setSelectedPosition(Number(e.target.value))}
              >
                {availablePositions.map((pos) => (
                  <option key={pos} value={pos}>
                    Seat {pos + 1}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm">Buy-in Amount</label>
              <Input
                type="number"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(Number(e.target.value))}
                min={selectedTableId ? (tables.find(t => t.id === selectedTableId)?.min_buy_in || 100) : 100}
                max={selectedTableId ? (tables.find(t => t.id === selectedTableId)?.max_buy_in || 5000) : 5000}
              />
              {selectedTableId && (
                <div className="text-xs text-muted-foreground">
                  Min: ${tables.find(t => t.id === selectedTableId)?.min_buy_in || 100} / 
                  Max: ${tables.find(t => t.id === selectedTableId)?.max_buy_in || 5000}
                </div>
              )}
            </div>
            
            {profile && (
              <div className="text-sm">
                Your balance: <span className="font-semibold">${profile.chips}</span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitJoin} 
              disabled={isLoading || (profile ? buyInAmount > profile.chips : false) || selectedPosition === null}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : 'Join Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeView;
