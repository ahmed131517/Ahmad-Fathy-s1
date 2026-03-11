import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, BrainCircuit } from 'lucide-react';

interface SelectionMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateMCQs: () => void;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({ x, y, onClose, onCreateMCQs }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-[100] bg-white shadow-xl rounded-xl border border-black/10 overflow-hidden"
      style={{ top: y, left: x }}
    >
      <button
        onClick={() => { onCreateMCQs(); onClose(); }}
        className="flex items-center gap-2 px-4 py-2 hover:bg-brand-olive/10 text-sm font-bold text-gray-700 transition-colors"
      >
        <BrainCircuit size={16} className="text-brand-olive" />
        توليد أسئلة (Create MCQs)
      </button>
    </motion.div>
  );
};
