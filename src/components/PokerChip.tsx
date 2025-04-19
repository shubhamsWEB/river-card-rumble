
import React from 'react';

interface PokerChipProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const PokerChip: React.FC<PokerChipProps> = ({ value, size = 'md', className = '', style }) => {
  // Determine chip color based on value
  const getChipColor = (value: number) => {
    if (value <= 5) return 'bg-poker-chip-red';
    if (value <= 25) return 'bg-poker-chip-blue';
    if (value <= 100) return 'bg-poker-chip-green';
    return 'bg-poker-chip-black';
  };

  // Determine chip size
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm': return 'w-6 h-6 text-xs';
      case 'lg': return 'w-10 h-10 text-sm';
      default: return 'w-8 h-8 text-xs';
    }
  };

  return (
    <div className={`poker-chip relative ${getChipColor(value)} ${getSizeClasses(size)} ${className} rounded-full flex items-center justify-center border-2 border-white shadow-md`} style={style}>
      <span className="text-white font-bold">{value}</span>
      <div className="absolute inset-0 rounded-full border-2 border-white border-opacity-20 scale-75"></div>
    </div>
  );
};

export default PokerChip;
