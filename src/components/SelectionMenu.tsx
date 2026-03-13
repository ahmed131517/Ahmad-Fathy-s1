import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, MessageSquare, AlignRight, Type, Search } from 'lucide-react';

import { Tooltip } from './Tooltip';

interface SelectionMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateMCQs: () => void;
  onExplain: () => void;
  onParse: () => void;
  onDiacritize: () => void;
  onLookup: () => void;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({ x, y, onClose, onCreateMCQs, onExplain, onParse, onDiacritize, onLookup }) => {
  const actions = [
    { label: 'شرح', icon: MessageSquare, action: onExplain },
    { label: 'إعراب', icon: AlignRight, action: onParse },
    { label: 'تشكيل', icon: Type, action: onDiacritize },
    { label: 'بحث', icon: Search, action: onLookup },
    { label: 'توليد أسئلة', icon: BrainCircuit, action: onCreateMCQs, highlight: true },
  ];

  return (
    <div 
      className="smart-toolbar fixed z-[100] pointer-events-none"
      style={{ top: y, left: x }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10, x: '-50%' }}
        animate={{ opacity: 1, scale: 1, y: -15, x: '-50%' }}
        exit={{ opacity: 0, scale: 0.9, y: 10, x: '-50%' }}
        className="absolute bottom-0 bg-white shadow-2xl rounded-xl border border-black/10 flex flex-row items-center p-1.5 gap-1 pointer-events-auto"
        onMouseDown={(e) => e.preventDefault()} // Prevent text selection from clearing
      >
        {/* Triangle pointer */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-black/10 rotate-45" />
        
        {actions.map((item, index) => (
          <Tooltip key={index} content={item.label} position="top">
            <button
              onClick={(e) => { 
                e.stopPropagation();
                item.action(); 
              }}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                item.highlight 
                  ? 'bg-brand-olive text-white hover:bg-brand-olive/90 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon size={16} className={item.highlight ? "text-white" : "text-brand-olive"} />
              {item.label}
            </button>
          </Tooltip>
        ))}
      </motion.div>
    </div>
  );
};
