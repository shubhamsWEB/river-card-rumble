
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, ArrowRight } from "lucide-react";
import { DbPokerTable } from '@/types/poker';

interface TablesListProps {
  tables: DbPokerTable[];
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
              <div className="flex flex-col gap-1">
                <div className="text-sm">
                  <span className="text-gray-500">Status: </span>
                  <span className={`font-medium ${
                    table.status === 'waiting' ? 'text-green-500' : 
                    table.status === 'playing' ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Round: </span>
                  <span className="font-medium">{table.current_round}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm">
                  <span className="text-gray-500">Blinds: </span>
                  <span className="font-medium">${table.small_blind}/${table.big_blind}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Buy-in: </span>
                  <span className="font-medium">${table.min_buy_in}-${table.max_buy_in}</span>
                </div>
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
