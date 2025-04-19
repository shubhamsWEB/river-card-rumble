
// Splitting this large file into components and hooks
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TableHeader from "@/components/poker/TableHeader";
import PokerTable from "@/components/PokerTable";
import HomeView from "@/components/poker/HomeView";
import { useTableActions } from "@/hooks/useTableActions";
import { DbPokerTable } from "@/types/poker";

const Index = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [isInGame, setIsInGame] = useState<boolean>(false);
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Check if user is already at a table on initial load
  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user) return;
      
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
  
  const tableActions = currentTableId ? useTableActions(currentTableId) : null;
  
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

  if (isInGame && currentTableId) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <TableHeader onLeaveTable={handleLeaveTable} />
        <main className="flex-grow">
          <PokerTable 
            tableId={currentTableId} 
            onAction={() => {}} // These are handled internally by useTableActions now
            onSendMessage={() => {}} // These are handled internally by useTableActions now
          />
        </main>
      </div>
    );
  }

  return <HomeView onJoinTable={handleJoinTable} />;
};

export default Index;
