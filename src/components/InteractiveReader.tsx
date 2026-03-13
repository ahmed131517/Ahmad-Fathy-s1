import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Type, AlignRight, MessageSquare, Network, Search, X, Loader2, Flag, CheckCircle2, AlertCircle, Copy, Check, Trash2, BrainCircuit } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { getMCQsByBookId, addNote, getNotesByChapterId, saveAnnotation, getAnnotationByChapterId, addMCQ } from '../services/db';
import { MCQ } from '../types';
import { SelectionMenu } from './SelectionMenu';
import { Tooltip } from './Tooltip';

interface InteractiveReaderProps {
  content: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'justify' | 'right';
  bookId?: string | number;
  chapterId?: string;
  refreshKey?: number;
  isPenToolActive?: boolean;
  penColor?: string;
  onSaveAnnotation?: (data: string) => void;
  initialAnnotations?: string;
  versions?: { id: string; name: string; content: string }[];
  activeVersionId?: string;
  onVersionChange?: (id: string) => void;
  selectedModel: string;
}

export function InteractiveReader({ 
  content, 
  fontSize, 
  fontFamily, 
  lineHeight,
  letterSpacing,
  textAlign,
  bookId, 
  chapterId,
  refreshKey,
  isPenToolActive,
  penColor = '#ef4444',
  onSaveAnnotation,
  initialAnnotations,
  versions = [],
  activeVersionId,
  onVersionChange,
  selectedModel
}: InteractiveReaderProps) {
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [aiResult, setAiResult] = useState<{ type: string; content: string; isLoading: boolean } | null>(null);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [selectedMcq, setSelectedMcq] = useState<MCQ | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, Record<number, string>>>({});
  const [showMcqResults, setShowMcqResults] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [notePopup, setNotePopup] = useState<{ paragraphId: number; rect: DOMRect; text: string } | null>(null);
  const [marginNotes, setMarginNotes] = useState<Record<number, string>>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Fetch MCQs
  useEffect(() => {
    if (bookId) {
      getMCQsByBookId(bookId).then(setMcqs);
    }
  }, [bookId, refreshKey]);

  // Load Notes and Annotations
  useEffect(() => {
    if (chapterId) {
      // Load Notes
      getNotesByChapterId(chapterId).then(notes => {
        const notesMap: Record<number, string> = {};
        notes.forEach(n => {
          notesMap[n.paragraphIndex] = n.content;
        });
        setMarginNotes(notesMap);
      });

      // Load Annotations
      getAnnotationByChapterId(chapterId).then(annotation => {
        if (annotation && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
            };
            img.src = annotation.data;
          }
        } else if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }
  }, [chapterId, refreshKey]);

  const handleCopy = () => {
    if (!selectedMcq) return;
    navigator.clipboard.writeText(selectedMcq.text_range);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.smart-toolbar') && !target.closest('.ai-result-popup') && !target.closest('.mcq-side-panel')) {
        setSelection(null);
        if (!target.closest('.ai-result-popup')) {
          setAiResult(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle flag clicks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFlagClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const flagElement = target.closest('.smart-flag');
      if (flagElement) {
        const mcqId = flagElement.getAttribute('data-mcq-id');
        const mcq = mcqs.find(m => m.id === mcqId);
        if (mcq) {
          setSelectedMcq(mcq);
        }
      }
    };
    
    container.addEventListener('click', handleFlagClick);
    return () => container.removeEventListener('click', handleFlagClick);
  }, [mcqs]);

  const handleAiAction = async (action: 'explain' | 'parse' | 'diacritize' | 'lookup' | 'generateMcqs') => {
    if (!selection) return;

    setAiResult({ type: action, content: '', isLoading: true });
    
    try {
      if (action === 'generateMcqs') {
        const response = await geminiService.generateMCQs(selection.text, selectedModel);
        const newMcq: MCQ = {
          id: Date.now().toString(),
          book_id: bookId?.toString() || 'unknown',
          page_number: 0,
          text_range: selection.text,
          questions: response.questions,
          answered: false,
          correct: false
        };
        await addMCQ(newMcq);
        setMcqs(prev => [...prev, newMcq]);
        setAiResult(null);
        setSelectedMcq(newMcq);
        return;
      }

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

      const response = await geminiService.generateText(prompt, selectedModel);
      setAiResult({ type: action, content: response, isLoading: false });
    } catch (error) {
      console.error("AI Action Error:", error);
      setAiResult({ type: action, content: 'حدث خطأ أثناء معالجة الطلب.', isLoading: false });
    }
  };

  const processedContent = useMemo(() => {
    let html = content;
    if (!mcqs.length) return html;

    // Sort MCQs by text length descending to avoid partial matches issues
    const sortedMcqs = [...mcqs].sort((a, b) => b.text_range.length - a.text_range.length);

    sortedMcqs.forEach(mcq => {
      // Escape special regex characters
      const escapedText = mcq.text_range.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedText})`, 'g');
      
      // We wrap the text and add a flag. 
      // Using a unique marker to avoid re-processing already processed parts
      html = html.replace(regex, `<span class="mcq-highlight" style="background-color: rgba(90, 90, 64, 0.1); border-bottom: 2px dashed #5A5A40;">$1</span><span class="smart-flag" data-mcq-id="${mcq.id}" style="cursor:pointer; margin-right:4px; display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; background:#5A5A40; color:white; border-radius:4px; font-size:10px;" title="أسئلة ذكية">🚩</span>`);
    });

    return html;
  }, [content, mcqs]);

  const handleMcqAnswer = (mcqId: string, qIdx: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [mcqId]: { ...(prev[mcqId] || {}), [qIdx]: answer }
    }));
  };

  const checkMcqAnswers = (mcqId: string) => {
    setShowMcqResults(prev => ({ ...prev, [mcqId]: true }));
  };

  // Handle Pen Tool Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isPenToolActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.scrollWidth;
        canvas.height = parent.scrollHeight;
        // Redraw initial annotations if any
        if (initialAnnotations) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = initialAnnotations;
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
      lastPos.current = { x, y };
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPos.current = { x, y };
    };

    const stopDrawing = () => {
      if (isDrawing.current) {
        isDrawing.current = false;
        if (onSaveAnnotation) {
          onSaveAnnotation(canvas.toDataURL());
        }
      }
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [isPenToolActive, penColor, onSaveAnnotation, initialAnnotations]);

  // Process content to add paragraph IDs for margin notes
  const paragraphs = useMemo(() => {
    const hasBlockElements = /<(p|div|h[1-6]|li|blockquote)\b[^>]*>/i.test(processedContent);
    
    if (!hasBlockElements) {
      // If no block elements, split by double newlines as fallback
      return processedContent.split(/\n\n+/).map((text, index) => ({
        id: index,
        text: text.replace(/<[^>]*>?/gm, '').trim(),
        html: text.trim()
      }));
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(processedContent, 'text/html');
    const pElements = Array.from(doc.body.children);

    return pElements.map((el, index) => ({
      id: index,
      text: el.textContent || '',
      html: el.outerHTML
    }));
  }, [processedContent]);

  const handleAddNote = (pId: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setNotePopup({
      paragraphId: pId,
      rect,
      text: marginNotes[pId] || ''
    });
  };

  const saveNote = async () => {
    if (notePopup && bookId && chapterId) {
      const noteData = {
        id: `${chapterId}-${notePopup.paragraphId}`,
        bookId: bookId.toString(),
        chapterId: chapterId,
        paragraphIndex: notePopup.paragraphId,
        content: notePopup.text,
        createdAt: Date.now()
      };
      
      await addNote(noteData);
      setMarginNotes(prev => ({ ...prev, [notePopup.paragraphId]: notePopup.text }));
      setNotePopup(null);
    }
  };

  return (
    <div className="relative flex flex-col" ref={containerRef}>
      {/* Version Tabs */}
      {versions.length > 0 && (
        <div className="flex border-b border-black/5 mb-6 bg-white/50 rounded-t-xl overflow-hidden">
          {versions.map(v => (
            <Tooltip key={v.id} content={`الانتقال إلى ${v.name}`}>
              <button
                onClick={() => onVersionChange?.(v.id)}
                className={`px-6 py-3 text-xs font-bold transition-all border-b-2 ${
                  activeVersionId === v.id 
                    ? 'border-brand-olive text-brand-olive bg-brand-olive/5' 
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v.name}
              </button>
            </Tooltip>
          ))}
        </div>
      )}

      <div className="relative">
        {/* Drawing Canvas Layer */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 z-10 pointer-events-none ${isPenToolActive ? 'pointer-events-auto cursor-crosshair' : ''}`}
          style={{ touchAction: 'none' }}
        />

        {isPenToolActive && (
          <Tooltip content="مسح جميع الرسومات والتعليقات التوضيحية" position="right">
            <button
              onClick={() => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (ctx && canvas) {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  if (onSaveAnnotation) onSaveAnnotation(canvas.toDataURL());
                }
              }}
              className="absolute top-4 left-4 z-20 p-2 bg-white/90 text-red-500 rounded-xl shadow-lg border border-red-100 hover:bg-red-50 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Trash2 size={14} />
              مسح الكل
            </button>
          </Tooltip>
        )}

        <div className="flex-1 relative z-0">
          <div 
            className={`text-gray-800 ${fontFamily} transition-all duration-300`}
            style={{ 
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              letterSpacing: `${letterSpacing}px`,
              textAlign: textAlign
            }}
          >
            {paragraphs.map((p, idx) => (
              <div key={idx} className="relative group mb-4">
                <div 
                  dangerouslySetInnerHTML={{ __html: p.html }} 
                  className="relative"
                />
                
                {/* Margin Note Trigger */}
                <Tooltip content={marginNotes[p.id] ? "تعديل الملحوظة" : "إضافة ملحوظة هامشية"} position="left">
                  <button
                    onClick={(e) => handleAddNote(p.id, e)}
                    className={`absolute -right-8 top-0 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                      marginNotes[p.id] ? 'opacity-100 text-brand-olive bg-brand-olive/10' : 'text-gray-300 hover:text-brand-olive hover:bg-brand-bg'
                    }`}
                  >
                    <MessageSquare size={16} />
                  </button>
                </Tooltip>

                {/* Display existing note indicator */}
                {marginNotes[p.id] && (
                  <div className="absolute -right-64 top-0 w-56 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-900 shadow-sm hidden lg:block">
                    <div className="font-bold mb-1 flex items-center gap-1">
                      <MessageSquare size={10} /> ملحوظة هامشية:
                    </div>
                    {marginNotes[p.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Note Edit Popup */}
      <AnimatePresence>
        {notePopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-black/10 p-4 w-72 flex flex-col gap-3 font-sans"
            style={{
              top: Math.min(window.innerHeight - 250, notePopup.rect.top),
              left: Math.max(20, notePopup.rect.left - 300)
            }}
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-olive">ملحوظة هامشية</span>
              <Tooltip content="إغلاق النافذة">
                <button onClick={() => setNotePopup(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </Tooltip>
            </div>
            <textarea
              autoFocus
              className="w-full h-32 p-3 bg-gray-50 border border-black/5 rounded-xl text-sm outline-none focus:border-brand-olive/30 transition-all resize-none"
              placeholder="اكتب ملحوظتك هنا..."
              value={notePopup.text}
              onChange={(e) => setNotePopup({ ...notePopup, text: e.target.value })}
            />
            <Tooltip content="حفظ الملحوظة في قاعدة البيانات">
              <button
                onClick={saveNote}
                className="w-full py-2 bg-brand-olive text-white rounded-xl text-xs font-bold hover:bg-brand-olive/90 transition-all"
              >
                حفظ الملحوظة
              </button>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Panel for MCQs */}
      <AnimatePresence>
        {selectedMcq && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="mcq-side-panel fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-[150] border-l border-black/5 flex flex-col font-sans"
            dir="rtl"
          >
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-brand-olive/5">
              <div className="flex items-center gap-2 text-brand-olive">
                <Flag size={20} />
                <h3 className="font-bold">الأسئلة الذكية</h3>
              </div>
              <Tooltip content="إغلاق لوحة الأسئلة">
                <button onClick={() => { setSelectedMcq(null); setSelection(null); }} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="relative group">
                <div className="p-4 bg-brand-bg rounded-xl border border-black/5 italic text-sm text-gray-600 leading-relaxed pr-10">
                  "{selectedMcq.text_range}"
                </div>
                <Tooltip content="نسخ النص المختار" position="left">
                  <button 
                    onClick={handleCopy}
                    className="absolute top-3 right-3 p-1.5 bg-white border border-black/5 rounded-lg text-gray-400 hover:text-brand-olive transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </Tooltip>
              </div>

              {selectedMcq.questions.map((q, qIdx) => {
                const isCorrect = userAnswers[selectedMcq.id]?.[qIdx] === q.correct_answer;
                const showResult = showMcqResults[selectedMcq.id];

                return (
                  <div key={qIdx} className="space-y-4">
                    <p className="font-bold text-gray-800 leading-relaxed">{qIdx + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => !showResult && handleMcqAnswer(selectedMcq.id, qIdx, opt)}
                          className={`w-full text-right p-3 rounded-xl border transition-all text-sm ${
                            userAnswers[selectedMcq.id]?.[qIdx] === opt 
                              ? 'bg-brand-olive text-white border-brand-olive shadow-md' 
                              : 'bg-gray-50 border-transparent hover:bg-gray-100'
                          } ${showResult && opt === q.correct_answer ? 'bg-emerald-100 border-emerald-500 text-emerald-900' : ''}
                            ${showResult && userAnswers[selectedMcq.id]?.[qIdx] === opt && opt !== q.correct_answer ? 'bg-red-100 border-red-500 text-red-900' : ''}
                          `}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {showResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl text-xs leading-relaxed flex gap-3 ${isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}
                      >
                        {isCorrect ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                        <div>
                          <p className="font-bold mb-1">{isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}</p>
                          <p>{q.explanation}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {!showMcqResults[selectedMcq.id] && (
              <div className="p-6 border-t border-black/5 bg-gray-50">
                <Tooltip content="تحقق من صحة إجاباتك وعرض التفسيرات" position="top">
                  <button
                    onClick={() => checkMcqAnswers(selectedMcq.id)}
                    disabled={!selectedMcq.questions.every((_, i) => userAnswers[selectedMcq.id]?.[i])}
                    className="w-full py-4 bg-brand-olive text-white rounded-2xl font-bold hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    تصحيح الإجابات
                  </button>
                </Tooltip>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Highlighting Toolbar */}
      <AnimatePresence>
        {selection && !aiResult && !selectedMcq && (
          <SelectionMenu
            x={selection.rect.left + (selection.rect.width / 2)}
            y={selection.rect.top}
            onClose={() => setSelection(null)}
            onCreateMCQs={() => handleAiAction('generateMcqs')}
            onExplain={() => handleAiAction('explain')}
            onParse={() => handleAiAction('parse')}
            onDiacritize={() => handleAiAction('diacritize')}
            onLookup={() => handleAiAction('lookup')}
          />
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
                {aiResult.type === 'generateMcqs' && <><BrainCircuit size={14} /> توليد أسئلة</>}
              </span>
              <Tooltip content="إغلاق نافذة النتائج">
                <button onClick={() => { setAiResult(null); setSelection(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </Tooltip>
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

