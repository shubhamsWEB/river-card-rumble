
import React from 'react';
import { usePokerTable } from '@/hooks/usePokerTable';
import { useTableActions } from '@/hooks/useTableActions';
import PokerTable from '@/components/PokerTable';
import { Loader2 } from 'lucide-react';

interface PokerTableViewProps {
  tableId: string;
}

const PokerTableView: React.FC<PokerTableViewProps> = ({ tableId }) => {
  const {
    isLoading,
    table,
    players,
    communityCards,
    chatMessages,
    reloadPlayers,
    reloadCommunityCards,
    reloadChatMessages,
    reloadTable
  } = usePokerTable(tableId);
  
  const tableActions = useTableActions(tableId);

  if (isLoading || !table) {
    return (
      <div className="w-full h-[calc(100vh-100px)] flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
          <p className="text-white text-lg">Loading poker table...</p>
        </div>
      </div>
    );
  }

  return (
    <PokerTable 
      tableId={tableId} 
      onAction={() => {}} // These are handled internally by useTableActions now
      onSendMessage={() => {}} // These are handled internally by useTableActions now
    />
  );
};

export default PokerTableView;
