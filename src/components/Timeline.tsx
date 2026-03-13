import React from 'react';
import { motion } from 'motion/react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineEvent {
  id: string;
  year: string;
  title: string;
  description: string;
  isActive?: boolean;
}

const MOCK_EVENTS: TimelineEvent[] = [
  { id: '1', year: '11 هـ', title: 'وفاة النبي ﷺ', description: 'بداية عصر الخلافة الراشدة' },
  { id: '2', year: '13 هـ', title: 'تولي عمر بن الخطاب', description: 'بداية الفتوحات الكبرى' },
  { id: '3', year: '15 هـ', title: 'معركة اليرموك', description: 'انتصار المسلمين على الروم' },
  { id: '4', year: '16 هـ', title: 'فتح القدس', description: 'دخول عمر بن الخطاب القدس', isActive: true },
  { id: '5', year: '21 هـ', title: 'معركة نهاوند', description: 'فتح الفتوح وسقوط الإمبراطورية الساسانية' },
  { id: '6', year: '23 هـ', title: 'وفاة عمر بن الخطاب', description: 'تولي عثمان بن عفان الخلافة' },
];

interface TimelineProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Timeline({ isOpen, onToggle }: TimelineProps) {
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white border-4 border-red-500 border-t border-black/10 px-6 py-4 flex flex-col gap-3 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-olive font-bold text-sm cursor-pointer" onClick={onToggle}>
          <Clock size={16} />
          <span>المخطط الزمني للأحداث (الخلفاء الراشدون)</span>
        </div>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-black/5 rounded text-gray-400"><ChevronRight size={16} /></button>
          <button className="p-1 hover:bg-black/5 rounded text-gray-400"><ChevronLeft size={16} /></button>
        </div>
      </div>

      {isOpen && (
        <div className="relative flex items-center h-16 overflow-x-auto custom-scrollbar pb-2">
          {/* Main Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
          
          <div className="flex items-center gap-12 min-w-max px-4 relative z-10">
            {MOCK_EVENTS.map((event, index) => (
              <div key={event.id} className="flex flex-col items-center group cursor-pointer">
                {/* Year Label (Top) */}
                <span className={`text-[10px] font-bold mb-2 transition-colors ${event.isActive ? 'text-brand-olive' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {event.year}
                </span>
                
                {/* Node */}
                <div className={`w-3 h-3 rounded-full border-2 transition-all ${event.isActive ? 'bg-brand-olive border-brand-olive scale-125 shadow-[0_0_10px_rgba(139,146,104,0.5)]' : 'bg-white border-gray-300 group-hover:border-brand-olive'}`} />
                
                {/* Title (Bottom) */}
                <div className="absolute top-full mt-2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-32 text-center">
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{event.title}</span>
                  <span className="text-[10px] text-gray-500 line-clamp-2 leading-tight mt-1">{event.description}</span>
                </div>
                
                {/* Active Title (Always visible if active) */}
                {event.isActive && (
                  <div className="absolute top-full mt-2 flex flex-col items-center w-32 text-center">
                    <span className="text-xs font-bold text-brand-olive whitespace-nowrap">{event.title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
