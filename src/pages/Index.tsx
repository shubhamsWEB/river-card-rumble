
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TableHeader from "@/components/poker/TableHeader";
import PokerTableView from "@/components/poker/PokerTableView";
import HomeView from "@/components/poker/HomeView";
import { useTableActions } from "@/hooks/useTableActions";

const Index = () => {
  const { user } = useAuth();
  const [isInGame, setIsInGame] = useState<boolean>(false);
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Initialize tableActions with null to ensure consistent hook usage
  // This fixes the "rendered more hooks than during previous render" error
  const tableActions = useTableActions(currentTableId || '');
  
  // Check if user is already at a table on initial load
  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('table_players')
          .select('table_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data?.table_id) {
          setCurrentTableId(data.table_id);
          setIsInGame(true);
        }
      } catch (error) {
        console.error("Error checking for existing games:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingGame();
  }, [user]);
  
  const handleLeaveTable = async () => {
    if (!currentTableId || !tableActions) return;
    
    try {
      await tableActions.handleLeaveTable();
      setIsInGame(false);
      setCurrentTableId(null);
    } catch (error) {
      console.error("Error leaving table:", error);
    }
  };
  
  const handleJoinTable = (tableId: string) => {
    setCurrentTableId(tableId);
    setIsInGame(true);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-xl">Loading...</p>
    </div>;
  }

  if (isInGame && currentTableId) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <TableHeader onLeaveTable={handleLeaveTable} />
        <main className="flex-grow">
          <PokerTableView tableId={currentTableId} />
        </main>
      </div>
    );
  }

  return <HomeView onJoinTable={handleJoinTable} />;
};

export default Index;
