
import React from 'react';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface TableHeaderProps {
  onLeaveTable: () => Promise<void>;
}

const TableHeader: React.FC<TableHeaderProps> = ({ onLeaveTable }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLeaveClick = async () => {
    await onLeaveTable();
    navigate("/");
  };

  return (
    <header className="bg-gray-800 p-4 flex items-center justify-between">
      <h1 className="text-white font-bold text-xl">River Card Rumble</h1>
      <div className="flex items-center gap-4">
        <div className="bg-gray-700 px-3 py-1.5 rounded-md flex items-center gap-2">
          <span className="text-poker-gold font-medium">${profile?.chips || 0}</span>
          <span className="text-white">chips</span>
        </div>
        <Button variant="outline" onClick={handleLeaveClick}>
          <LogOut className="mr-2 h-4 w-4" />
          Leave Table
        </Button>
      </div>
    </header>
  );
};

export default TableHeader;
