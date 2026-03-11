import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Type, AlignRight, MessageSquare, Network, Search, X, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface InteractiveReaderProps {
  content: string;
  fontSize: number;
  fontFamily: string;
}

export function InteractiveReader({ content, fontSize, fontFamily }: InteractiveReaderProps) {
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [aiResult, setAiResult] = useState<{ type: string; content: string; isLoading: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0 && containerRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          text: sel.toString().trim(),
          rect: rect
        });
      } else {
        // Don't clear selection if we are interacting with the toolbar or result popup
        // We'll handle clearing manually when clicking outside
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.smart-toolbar') && !target.closest('.ai-result-popup')) {
        setSelection(null);
        if (!target.closest('.ai-result-popup')) {
          setAiResult(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAiAction = async (action: 'explain' | 'parse' | 'diacritize' | 'lookup') => {
    if (!selection) return;

    setAiResult({ type: action, content: '', isLoading: true });
    
    try {
      let prompt = '';
      switch (action) {
        case 'explain':
          prompt = `اشرح النص التالي بأسلوب مبسط وواضح:\n\n"${selection.text}"`;
          break;
        case 'parse':
          prompt = `قم بإعراب الجملة التالية إعراباً مفصلاً:\n\n"${selection.text}"`;
          break;
        case 'diacritize':
          prompt = `قم بتشكيل النص التالي تشكيلاً كاملاً دقيقاً:\n\n"${selection.text}"`;
          break;
        case 'lookup':
          prompt = `أعطني نبذة مختصرة تعريفية عن العلم أو المصطلح التالي:\n\n"${selection.text}"`;
          break;
      }

      const response = await geminiService.generateText(prompt);
      setAiResult({ type: action, content: response, isLoading: false });
    } catch (error) {
      console.error("AI Action Error:", error);
      setAiResult({ type: action, content: 'حدث خطأ أثناء معالجة الطلب.', isLoading: false });
    }
  };

  // Function to simulate hyper-linked text (wrapping specific words)
  // In a real app, this would be done by NLP processing beforehand
  const renderInteractiveText = () => {
    // For demonstration, we'll just render the text normally, 
    // relying on the user's selection for interaction.
    // If we wanted to auto-link, we'd parse the HTML/text here.
    return (
      <div 
        className={`leading-loose text-gray-800 ${fontFamily}`}
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {renderInteractiveText()}

      {/* Smart Highlighting Toolbar */}
      <AnimatePresence>
        {selection && !aiResult && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="smart-toolbar fixed z-50 bg-gray-900 text-white rounded-lg shadow-xl flex items-center p-1 gap-1"
            style={{
              top: selection.rect.top - 50,
              left: selection.rect.left + (selection.rect.width / 2),
              transform: 'translateX(-50%)'
            }}
          >
            <button onClick={() => handleAiAction('explain')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-md text-sm transition-colors">
              <MessageSquare size={14} />
              <span>شرح</span>
            </button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => handleAiAction('parse')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-md text-sm transition-colors">
              <AlignRight size={14} />
              <span>إعراب</span>
            </button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => handleAiAction('diacritize')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-md text-sm transition-colors">
              <Type size={14} />
              <span>تشكيل</span>
            </button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => handleAiAction('lookup')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-md text-sm transition-colors">
              <Search size={14} />
              <span>ترجمة/تعريف</span>
            </button>
            
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Result Popup */}
      <AnimatePresence>
        {aiResult && selection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="ai-result-popup fixed z-50 bg-white rounded-xl shadow-2xl border border-black/10 w-80 max-h-96 flex flex-col overflow-hidden"
            style={{
              top: selection.rect.bottom + 10,
              left: selection.rect.left + (selection.rect.width / 2),
              transform: 'translateX(-50%)'
            }}
          >
            <div className="bg-gray-50 px-4 py-3 border-b border-black/5 flex items-center justify-between">
              <span className="text-sm font-bold text-brand-olive flex items-center gap-2">
                {aiResult.type === 'explain' && <><MessageSquare size={14} /> شرح النص</>}
                {aiResult.type === 'parse' && <><AlignRight size={14} /> الإعراب</>}
                {aiResult.type === 'diacritize' && <><Type size={14} /> التشكيل</>}
                {aiResult.type === 'lookup' && <><Search size={14} /> بطاقة تعريف</>}
              </span>
              <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-sm leading-relaxed text-gray-700">
              {aiResult.isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-brand-olive">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <span className="text-xs">جاري المعالجة الذكية...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap font-amiri text-base">{aiResult.content}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
