
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import TablesList from "@/components/TablesList";
import PokerTable from "@/components/PokerTable";
import { mockTable, mockChatMessages, mockAvailableTables } from "@/data/mockData";
import { Users } from "lucide-react";

const Index = () => {
  const [playerName, setPlayerName] = useState<string>("");
  const [buyInAmount, setBuyInAmount] = useState<number>(1000);
  const [isInGame, setIsInGame] = useState<boolean>(false);
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(false);
  
  const handleJoinTable = (tableId: string) => {
    // For now, we'll just show the join dialog
    setShowJoinDialog(true);
  };
  
  const handleSubmitJoin = () => {
    if (playerName.trim()) {
      // In a real app, we would update the player name and buy-in amount
      setIsInGame(true);
      setShowJoinDialog(false);
    }
  };
  
  const handleCreateNewTable = () => {
    // For now, we'll just show the join dialog
    setShowJoinDialog(true);
  };

  if (isInGame) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <header className="bg-gray-800 p-4 flex items-center justify-between">
          <h1 className="text-white font-bold text-xl">River Card Rumble</h1>
          <Button variant="outline" onClick={() => setIsInGame(false)}>
            Leave Table
          </Button>
        </header>
        
        <main className="flex-grow">
          <PokerTable table={mockTable} chatMessages={mockChatMessages} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 p-4 text-center">
        <h1 className="text-white font-bold text-3xl">River Card Rumble</h1>
        <p className="text-gray-400 mt-1">Real-time multiplayer poker</p>
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
                <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-md">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-white">{mockAvailableTables.reduce((sum, t) => sum + t.players, 0)} Players Online</span>
                </div>
              </div>
              
              <TablesList tables={mockAvailableTables} onJoinTable={handleJoinTable} />
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
                  <Input placeholder="My Poker Table" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Small Blind</label>
                    <Input type="number" min="1" defaultValue="5" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Big Blind</label>
                    <Input type="number" min="2" defaultValue="10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Min Buy-in</label>
                    <Input type="number" min="100" defaultValue="500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Max Buy-in</label>
                    <Input type="number" min="100" defaultValue="2000" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Max Players</label>
                  <Input type="number" min="2" max="9" defaultValue="9" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleCreateNewTable}>Create Table</Button>
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
              Enter your details to join this poker table.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm">Your Name</label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm">Buy-in Amount</label>
              <Input
                type="number"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(Number(e.target.value))}
                min={100}
                max={5000}
              />
              <div className="text-xs text-muted-foreground">Min: $100 / Max: $5000</div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitJoin} disabled={!playerName.trim()}>
              Join Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
