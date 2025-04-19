
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, ArrowRight } from "lucide-react";

interface Table {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
}

interface TablesListProps {
  tables: Table[];
  onJoinTable: (tableId: string) => void;
}

const TablesList: React.FC<TablesListProps> = ({ tables, onJoinTable }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tables.map((table) => (
        <Card key={table.id} className="overflow-hidden border-2 hover:border-primary transition-colors">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2">{table.name}</h3>
            
            <div className="flex justify-between mb-4">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Users size={16} />
                <span>{table.players}/{table.maxPlayers}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Blinds: </span>
                <span className="font-medium">${table.smallBlind}/${table.bigBlind}</span>
              </div>
            </div>
            
            <Button 
              onClick={() => onJoinTable(table.id)} 
              className="w-full flex items-center justify-center gap-2"
            >
              Join Table
              <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TablesList;
