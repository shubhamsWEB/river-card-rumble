
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

type RealtimeContextType = {
  subscribe: (tableId: string, callback: (payload: any) => void) => () => void;
};

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Record<string, RealtimeChannel>>({});

  // Clean up channels on unmount
  useEffect(() => {
    return () => {
      Object.values(channels).forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [channels]);

  const subscribe = (tableId: string, callback: (payload: any) => void) => {
    if (channels[tableId]) {
      return () => {}; // Already subscribed
    }

    // Subscribe to table changes
    const channel = supabase
      .channel(`table:${tableId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_tables',
        filter: `id=eq.${tableId}`,
      }, (payload) => {
        callback({ type: 'table', payload });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'table_players',
        filter: `table_id=eq.${tableId}`,
      }, (payload) => {
        callback({ type: 'player', payload });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_cards',
        filter: `table_id=eq.${tableId}`,
      }, (payload) => {
        callback({ type: 'card', payload });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'actions',
        filter: `table_id=eq.${tableId}`,
      }, (payload) => {
        callback({ type: 'action', payload });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `table_id=eq.${tableId}`,
      }, (payload) => {
        callback({ type: 'chat', payload });
      })
      .subscribe();

    // Store the channel reference
    setChannels(prev => ({ ...prev, [tableId]: channel }));

    // Return unsubscribe function
    return () => {
      if (channels[tableId]) {
        supabase.removeChannel(channels[tableId]);
        setChannels(prev => {
          const newChannels = { ...prev };
          delete newChannels[tableId];
          return newChannels;
        });
      }
    };
  };

  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
