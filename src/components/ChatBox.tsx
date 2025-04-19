
import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal } from 'lucide-react';
import { ChatMessage } from '../types/poker';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  className?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, className = '' }) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-gray-800 bg-opacity-80 rounded-md flex flex-col ${className}`}>
      <div className="p-2 border-b border-gray-700">
        <h3 className="text-white text-sm font-semibold">Table Chat</h3>
      </div>
      
      <ScrollArea className="flex-grow h-[200px]" ref={scrollAreaRef}>
        <div className="p-2 space-y-2">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="text-xs text-gray-400">{formatTime(msg.timestamp)} </span>
                <span className="font-semibold text-blue-400">{msg.playerName}: </span>
                <span className="text-white">{msg.message}</span>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center text-sm">No messages yet</div>
          )}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSendMessage} className="p-2 border-t border-gray-700 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="bg-gray-900 text-white text-sm border-gray-700"
        />
        <Button type="submit" size="sm" className="px-2">
          <SendHorizontal size={16} />
        </Button>
      </form>
    </div>
  );
};

export default ChatBox;
