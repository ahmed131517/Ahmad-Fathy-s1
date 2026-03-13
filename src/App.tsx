/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SelectionMenu } from './components/SelectionMenu';
import { MCQModal } from './components/MCQModal';
import { 
  Book as BookIcon, 
  Search, 
  MessageSquare, 
  Upload, 
  Globe, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  FileText, 
  Brain, 
  Copy, 
  Image as ImageIcon,
  Loader2,
  X,
  Plus,
  Minus,
  Type,
  Home,
  Compass,
  LogOut,
  ChevronDown,
  Share2,
  Edit3,
  Filter,
  FileUp,
  Layout,
  Cpu,
  RefreshCw,
  Zap,
  Sun,
  Moon,
  Palette,
  User,
  Sparkles,
  BookOpen,
  Send,
  Network,
  Info,
  CheckCircle2,
  FileSearch,
  StickyNote,
  Layers,
  Activity,
  Library,
  Target,
  Clock,
  BookMarked,
  Bookmark,
  FolderOpen,
  Eye,
  PenTool,
  Wand2,
  GitMerge,
  FileCheck,
  Database,
  GraduationCap,
  AlignRight,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { geminiService } from './services/geminiService';
import { searchChunks, getBook, getAllBooks as getLocalBooks, addMCQ, saveAnnotation, addNote, addBook, dbService } from './services/db';
import { InteractiveReader } from './components/InteractiveReader';
import { AutoMindmapModal } from './components/AutoMindmapModal';
import { Timeline } from './components/Timeline';
import { LibraryManager } from './components/LibraryManager';
import { VoiceSearch } from './components/VoiceSearch';
import { AIResearchAssistant } from './components/AIResearchAssistant';
import { OCRModal } from './components/OCRModal';
import { Book, Chunk, ChatMessage, BookRelationship, Chapter, MCQ } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [fontSize, setFontSize] = useState(22);
  const [fontFamily, setFontFamily] = useState('font-amiri');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textAlign, setTextAlign] = useState<'justify' | 'right'>('justify');
  const [isPenToolActive, setIsPenToolActive] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [annotations, setAnnotations] = useState<{ id: string; paths: string[] } | null>(null);
  const [marginNotes, setMarginNotes] = useState<any[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [navMode, setNavMode] = useState<'tree' | 'map'>('tree');
  const [hoveredBook, setHoveredBook] = useState<Book | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [showPdfSync, setShowPdfSync] = useState(false);
  const [relationships, setRelationships] = useState<BookRelationship[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-pro-preview');

  const [showBookTree, setShowBookTree] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showMindmap, setShowMindmap] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'day' | 'night' | 'heritage'>('heritage');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showLibraryExplorer, setShowLibraryExplorer] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [mcqModalOpen, setMcqModalOpen] = useState(false);
  const [currentMCQs, setCurrentMCQs] = useState<MCQ | null>(null);
  const [aiResult, setAiResult] = useState<{ type: string; content: string; isLoading: boolean } | null>(null);
  const [mcqRefreshKey, setMcqRefreshKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isLibraryManagerOpen, setIsLibraryManagerOpen] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  const [showTypographySettings, setShowTypographySettings] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [studyMode, setStudyMode] = useState(false);

  const toggleStudyMode = () => {
    setStudyMode(!studyMode);
    // You can add more study mode specific logic here later
  };

  const toggleResearchMode = () => {
    const newMode = !researchMode;
    setResearchMode(newMode);
    
    if (newMode) {
      // Enable advanced research features
      setShowAIAssistant(true);
      setShowPdfSync(true);
      setNavMode('map');
    } else {
      // Revert to normal reading mode
      setShowAIAssistant(false);
      setShowPdfSync(false);
      setNavMode('tree');
    }
  };

  const handleSaveOCRToLibrary = async (title: string, content: string) => {
    const newBook: Book = {
      id: crypto.randomUUID(),
      title,
      author: 'مستخرج آلياً',
      source_type: 'file',
      content,
      created_at: new Date().toISOString(),
      is_indexed: false,
      has_pdf: false,
      has_notes: false,
      category: 'مستخرجات OCR',
      dateAdded: Date.now()
    };
    
    await addBook(newBook);
    await fetchBooks();
    handleBookSelect(newBook);
  };

  const handleAiAction = async (action: 'explain' | 'parse' | 'diacritize' | 'lookup') => {
    setAiResult({ type: action, content: '', isLoading: true });
    try {
      let prompt = '';
      switch (action) {
        case 'explain':
          prompt = `اشرح النص التالي بأسلوب مبسط وواضح:\n\n"${selectedText}"`;
          break;
        case 'parse':
          prompt = `قم بإعراب الجملة التالية إعراباً مفصلاً:\n\n"${selectedText}"`;
          break;
        case 'diacritize':
          prompt = `قم بتشكيل النص التالي تشكيلاً كاملاً دقيقاً:\n\n"${selectedText}"`;
          break;
        case 'lookup':
          prompt = `أعطني نبذة مختصرة تعريفية عن العلم أو المصطلح التالي:\n\n"${selectedText}"`;
          break;
      }
      const response = await geminiService.generateText(prompt, selectedModel);
      setAiResult({ type: action, content: response, isLoading: false });
    } catch (e) {
      console.error(e);
      setAiResult({ type: action, content: 'حدث خطأ.', isLoading: false });
    }
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOmniSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setOmniSearchOpen(false);
        setActiveMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resetFormatting = () => {
    setFontSize(22);
    setFontFamily('font-amiri');
    setLineHeight(1.8);
    setLetterSpacing(0);
    setTextAlign('justify');
  };

  const themes = {
    day: 'bg-[#f5f5f0] text-brand-ink',
    night: 'bg-[#1a1a1a] text-gray-200',
    heritage: 'bg-[#f5f2ed] text-brand-ink'
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const suggestions = books
        .filter(b => b.title.includes(searchQuery) || b.author.includes(searchQuery))
        .map(b => b.title)
        .slice(0, 5);
      
      const commonQueries = [
        'ما رأي الشافعية في زكاة الحلي؟',
        'شرح حديث إنما الأعمال بالنيات',
        'ترجمة الإمام البخاري',
        'أصول الفقه عند المالكية'
      ].filter(q => q.includes(searchQuery));

      setSearchSuggestions([...new Set([...suggestions, ...commonQueries])]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, books]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        setMenuPosition(null);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    const handleGlobalCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection && selection.toString() && selectedBook) {
        e.preventDefault();
        const text = selection.toString();
        const citation = `\n\nالمصدر: ${selectedBook.title}`;
        e.clipboardData?.setData('text/plain', text + citation);
      }
    };
    window.addEventListener('copy', handleGlobalCopy);
    return () => window.removeEventListener('copy', handleGlobalCopy);
  }, [selectedBook]);

  const fetchBooks = async () => {
    try {
      const allBooks = await dbService.getBooks();
      setBooks(allBooks);
      
      if (allBooks.length > 0 && !selectedBook) {
        handleBookSelect(allBooks[0]);
      }
      
      // Fetch relationships for the map
      const relRes = await fetch('/api/relationships');
      const relData = await relRes.json();
      setRelationships(relData);
    } catch (e) {
      console.warn("Failed to fetch books:", e);
    }
  };

  const handleBookSelect = async (book: Book) => {
    if (book.source_type === 'db') {
      setSelectedBook(book);
      return;
    }
    try {
      const res = await fetch(`/api/books/${book.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBook(data);
      } else {
        setSelectedBook(book);
      }
    } catch (e) {
      setSelectedBook(book);
    }
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setUploadModalOpen(false);
        fetchBooks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScrape = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    const title = formData.get('title') as string;
    setIsScraping(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title }),
      });
      if (res.ok) {
        setUploadModalOpen(false);
        fetchBooks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div 
      className={`flex h-screen w-full ${themes[activeTheme]} overflow-hidden font-amiri transition-colors duration-500`}
      dir="rtl"
    >
      {/* Icon Sidebar */}
      <div className="w-16 bg-brand-olive text-white flex flex-col items-center py-4 gap-6 z-[100] shadow-xl shrink-0">
        <button 
          onClick={() => setActiveTab('home')}
          className={cn("p-3 rounded-xl transition-colors", activeTab === 'home' ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")} 
          title="الرئيسية"
        >
          <Home size={20} />
        </button>
        <button 
          onClick={() => setActiveTab('explore')}
          className={cn("p-3 rounded-xl transition-colors", activeTab === 'explore' ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")} 
          title="استكشاف"
        >
          <Compass size={20} />
        </button>
        <button 
          onClick={() => {
            setActiveTab('books');
            setIsLibraryManagerOpen(true);
          }}
          className={cn("p-3 rounded-xl transition-colors", activeTab === 'books' ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")} 
          title="الكتب"
        >
          <Library size={20} />
        </button>
        <button 
          onClick={toggleStudyMode}
          className={cn("p-3 rounded-xl transition-colors", studyMode ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")} 
          title="وضع الدراسة"
        >
          <GraduationCap size={20} />
        </button>
        <div className="flex-1" />
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors" 
          title="الإعدادات"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col overflow-hidden relative"
        onMouseUp={(e) => {
          const selection = window.getSelection();
          if (selection && selection.toString().trim().length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelectedText(selection.toString());
            setMenuPosition({ 
              x: rect.left + rect.width / 2, 
              y: rect.top 
            });
          } else {
            setMenuPosition(null);
          }
        }}
      >
        {menuPosition && !aiResult && (
        <SelectionMenu
          x={menuPosition.x}
          y={menuPosition.y}
          onClose={() => setMenuPosition(null)}
          onCreateMCQs={async () => {
            setAiResult({ type: 'generateMcqs', content: '', isLoading: true });
            try {
              const mcqs = await geminiService.generateMCQs(selectedText, selectedModel);
              setCurrentMCQs({
                id: crypto.randomUUID(),
                book_id: selectedBook?.id || 'unknown',
                page_number: 0,
                text_range: selectedText,
                questions: mcqs.questions,
                answered: false,
                correct: false
              });
              setAiResult(null);
              setMenuPosition(null);
              setMcqModalOpen(true);
            } catch (e) {
              console.error(e);
              setAiResult({ type: 'generateMcqs', content: 'حدث خطأ أثناء توليد الأسئلة.', isLoading: false });
            }
          }}
          onExplain={() => handleAiAction('explain')}
          onParse={() => handleAiAction('parse')}
          onDiacritize={() => handleAiAction('diacritize')}
          onLookup={() => handleAiAction('lookup')}
        />
      )}
      {mcqModalOpen && currentMCQs && (
        <MCQModal
          mcq={currentMCQs}
          onClose={() => setMcqModalOpen(false)}
          onSave={async (mcq) => {
            await addMCQ(mcq);
            setMcqModalOpen(false);
            setMcqRefreshKey(prev => prev + 1);
          }}
        />
      )}
      {aiResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="ai-result-popup fixed z-[100] bg-white rounded-xl shadow-2xl border border-black/10 w-80 max-h-96 flex flex-col overflow-hidden"
          style={{
            top: menuPosition ? menuPosition.y + 50 : 100,
            left: menuPosition ? menuPosition.x : 100,
          }}
        >
          <div className="bg-gray-50 px-4 py-3 border-b border-black/5 flex items-center justify-between">
            <span className="text-sm font-bold text-brand-olive flex items-center gap-2">
              {aiResult.type === 'explain' && <><MessageSquare size={14} /> شرح النص</>}
              {aiResult.type === 'parse' && <><AlignRight size={14} /> الإعراب</>}
              {aiResult.type === 'diacritize' && <><Type size={14} /> التشكيل</>}
              {aiResult.type === 'lookup' && <><Search size={14} /> بحث/تعريف</>}
              {aiResult.type === 'generateMcqs' && <><BrainCircuit size={14} /> توليد أسئلة</>}
            </span>
            <button onClick={() => { setAiResult(null); setMenuPosition(null); }} className="text-gray-400 hover:text-gray-600">
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
      {/* 1. Menu Bar (Dropdowns) */}
      <div className="h-8 bg-white/40 backdrop-blur-md border-b border-black/5 flex items-center px-4 gap-6 text-xs z-50 select-none">
        <div className="flex items-center gap-1 font-bold text-brand-olive">
          <BookIcon size={14} />
          <span>المكتبة الشاملة الذكية</span>
        </div>

        <div className="flex items-center gap-4 relative">
          <MenuDropdown 
            label="ملف" 
            isOpen={activeMenu === 'file'} 
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            items={[
              { label: 'استيراد ملفات...', icon: <FileUp size={14} />, onClick: () => setUploadModalOpen(true) },
              { label: 'كشط ويب (Web Scraper)', icon: <Globe size={14} />, onClick: () => {} },
              { label: 'إعدادات المكتبة', icon: <Settings size={14} />, onClick: () => setShowSettings(true) },
            ]}
          />
          <MenuDropdown 
            label="عرض" 
            isOpen={activeMenu === 'view'} 
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            items={[
              { label: 'الوضع النهاري', icon: <Sun size={14} />, onClick: () => setActiveTheme('day') },
              { label: 'الوضع الليلي', icon: <Moon size={14} />, onClick: () => setActiveTheme('night') },
              { label: 'الوضع التراثي', icon: <Palette size={14} />, onClick: () => setActiveTheme('heritage') },
              { type: 'divider' },
              { label: showBookTree ? 'إخفاء شجرة الكتب' : 'إظهار شجرة الكتب', icon: <Layout size={14} />, onClick: () => setShowBookTree(!showBookTree) },
              { label: showAIAssistant ? 'إخفاء المساعد الذكي' : 'إظهار المساعد الذكي', icon: <MessageSquare size={14} />, onClick: () => setShowAIAssistant(!showAIAssistant) },
            ]}
          />
          <MenuDropdown 
            label="أدوات الذكاء الاصطناعي" 
            isOpen={activeMenu === 'ai'} 
            onClick={() => setActiveMenu(activeMenu === 'ai' ? null : 'ai')}
            items={[
              { label: 'إعدادات Ollama', icon: <Cpu size={14} />, onClick: () => setShowSettings(true) },
              { label: 'تحديث الفهرس الدلالي', icon: <Search size={14} />, onClick: () => {} },
              { label: 'استخراج نص من صورة (OCR)', icon: <FileText size={14} />, onClick: () => setShowOCRModal(true) },
            ]}
          />
        </div>
      </div>

      {/* 2. Smart Toolbar */}
      <div className="h-16 bg-white/60 backdrop-blur-xl border-b border-black/5 flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLibraryManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-olive text-white rounded-xl shadow-lg shadow-brand-olive/20 hover:scale-105 transition-transform font-bold text-sm relative z-[9999]"
          >
            <Library size={18} />
            <span>إدارة المكتبة</span>
          </button>
          <button 
            onClick={() => setShowEditor(!showEditor)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-sm",
              showEditor ? "bg-brand-olive text-white border-brand-olive shadow-md" : "bg-white border-black/5 text-gray-600 hover:bg-gray-50"
            )}
          >
            <PenTool size={18} />
            <span>محرر البحث</span>
          </button>
          <button 
            onClick={() => setUploadModalOpen(true)}
            className="p-2.5 bg-white text-brand-olive border border-brand-olive/20 rounded-xl shadow-sm hover:bg-brand-olive/5 transition-colors"
            title="إضافة كتاب جديد"
          >
            <Plus size={20} />
          </button>
          <button className="p-2.5 bg-white border border-black/5 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Unified Search Engine */}
        <div className="flex-1 max-w-2xl mx-8 relative group">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-olive transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="بحث في الكتب، المؤلفين، أو اسأل الذكاء الاصطناعي... (Ctrl + K)"
            className="w-full h-11 bg-brand-bg/50 border border-black/5 rounded-2xl pr-12 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20 focus:bg-white transition-all text-right"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              setOmniSearchOpen(true);
              setShowSuggestions(true);
            }}
          />
          <AnimatePresence>
            {showSuggestions && searchSuggestions.length > 0 && omniSearchOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-[60] font-amiri"
              >
                {searchSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchQuery(s);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-right px-6 py-3 hover:bg-brand-olive/5 flex items-center justify-between group transition-colors"
                  >
                    <span className="text-gray-400 group-hover:text-brand-olive"><Search size={14} /></span>
                    <span className="text-sm text-gray-700">{s}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute left-3 inset-y-0 flex items-center gap-2">
            <VoiceSearch 
              onResult={(text) => {
                setSearchQuery(text);
                setOmniSearchOpen(true);
              }} 
            />
            <kbd className="px-2 py-1 bg-gray-100 border border-black/10 rounded text-[10px] text-gray-400 font-sans">Ctrl K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleResearchMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${researchMode ? 'bg-brand-olive text-white border-brand-olive shadow-md' : 'bg-white border-black/5 text-gray-600 hover:bg-gray-50'}`}
          >
            <Zap size={16} className={researchMode ? 'animate-pulse' : ''} />
            <span className="text-xs font-bold">وضع المجاهر</span>
          </button>
          
          <div className="h-8 w-px bg-gray-200 mx-1" />
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-olive/10 border border-brand-olive/20 flex items-center justify-center text-brand-olive font-bold shadow-inner">
              AF
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left Column: Book Navigation */}
        <AnimatePresence>
          {showBookTree && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white/40 backdrop-blur-md border-l border-black/5 flex flex-col shrink-0 overflow-hidden relative"
            >
              <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white/20">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setNavMode('tree')}
                    className={cn("p-2 rounded-lg transition-all", navMode === 'tree' ? "bg-white shadow-sm text-brand-olive" : "text-gray-400")}
                  >
                    <Layers size={16} />
                  </button>
                  <button 
                    onClick={() => setNavMode('map')}
                    className={cn("p-2 rounded-lg transition-all", navMode === 'map' ? "bg-white shadow-sm text-brand-olive" : "text-gray-400")}
                  >
                    <Network size={16} />
                  </button>
                </div>
                <span className="text-xs font-bold text-gray-500">نظام التصفح</span>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar h-full">
                {navMode === 'tree' ? (
                  <>
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="بحث في المكتبة..."
                        className="w-full bg-brand-bg rounded-2xl py-3 pl-10 pr-10 focus:outline-none text-sm text-right"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <VoiceSearch onResult={(text) => setSearchQuery(text)} />
                        <Filter className="text-gray-400" size={18} />
                      </div>
                    </div>

                    <div className="space-y-2 mb-8">
                      {books.map(book => (
                        <div key={book.id} className="relative group">
                          <button 
                            onClick={() => handleBookSelect(book)}
                            onMouseEnter={() => setHoveredBook(book)}
                            onMouseLeave={() => setHoveredBook(null)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-right",
                              selectedBook?.id === book.id ? "bg-brand-bg border border-brand-olive/10" : "hover:bg-brand-bg/50"
                            )}
                          >
                            <div className={cn("p-2 rounded-xl", selectedBook?.id === book.id ? "bg-brand-olive text-white" : "bg-gray-100 text-gray-400")}>
                              <BookIcon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{book.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                {book.is_indexed && <CheckCircle2 size={10} className="text-emerald-500" title="مفهرس ذكياً" />}
                                {book.has_pdf && <FileSearch size={10} className="text-blue-500" title="نسخة PDF متوفرة" />}
                                {book.has_notes && <StickyNote size={10} className="text-amber-500" title="توجد ملاحظات" />}
                              </div>
                            </div>
                          </button>
                          
                          {/* Quick Preview Pop-up */}
                          <AnimatePresence>
                            {hoveredBook?.id === book.id && (
                              <motion.div 
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="absolute left-full ml-4 top-0 w-64 bg-white rounded-2xl shadow-2xl border border-black/5 p-4 z-[100] pointer-events-none"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-lg bg-brand-olive/10 flex items-center justify-center text-brand-olive">
                                    <Info size={16} />
                                  </div>
                                  <h4 className="text-xs font-bold text-brand-olive">بطاقة التعريف</h4>
                                </div>
                                <p className="text-sm font-bold mb-1">{book.title}</p>
                                <p className="text-[10px] text-gray-500 mb-3">المؤلف: {book.author} ({book.author_death_year})</p>
                                <div className="bg-brand-bg/50 p-2 rounded-lg">
                                  <p className="text-[10px] leading-relaxed text-gray-600 italic">
                                    {book.ai_summary || "جاري توليد ملخص ذكي لمحتوى هذا الكتاب..."}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>

                    {/* TOC Tree View */}
                    {selectedBook && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                          <ChevronDown size={16} />
                          <span>فهرس الكتاب</span>
                        </div>
                        <div className="mr-4 space-y-1 border-r-2 border-gray-100 pr-4">
                          {selectedBook.chapters?.map(chapter => (
                            <TreeItem 
                              key={chapter.id} 
                              label={chapter.title} 
                              active={activeChapter?.id === chapter.id}
                              onClick={() => setActiveChapter(chapter)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 min-h-[400px]">
                      <MindMap books={books} relationships={relationships} onSelect={handleBookSelect} />
                    </div>
                    <div className="p-4 bg-brand-olive/5 rounded-2xl mt-4">
                      <p className="text-[10px] text-brand-olive font-bold mb-1">دليل الخريطة:</p>
                      <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-500">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-brand-olive" /> كتاب أصلي</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> شرح</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> حاشية</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400" /> مختصر</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      {/* Middle Column: Reading Area or Research Editor */}
      {showEditor ? (
        <ResearchEditor onClose={() => setShowEditor(false)} />
      ) : (
        <main className="flex-1 bg-white rounded-[32px] flex flex-col overflow-hidden shadow-sm border border-black/5 relative">
          <div className="p-6 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPdfSync(!showPdfSync)}
                className={cn("p-2 rounded-xl transition-all", showPdfSync ? "bg-brand-olive text-white" : "hover:bg-brand-bg text-gray-400")}
                title="مزامنة PDF"
              >
                <FileText size={20} />
              </button>
              <button className="p-2 hover:bg-brand-bg rounded-xl text-gray-400"><X size={20} /></button>
              <button 
                onClick={() => setShowMindmap(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-olive/10 text-brand-olive rounded-lg text-xs font-bold hover:bg-brand-olive/20 transition-colors"
                title="توليد خريطة ذهنية للفصل"
              >
                <Network size={14} />
                خريطة ذهنية
              </button>
            </div>
            <h2 className="text-xl font-bold font-amiri">
              {selectedBook?.title || "منطقة القراءة"}
            </h2>
            <div className="flex items-center gap-2">
               <div className="relative flex items-center gap-2">
                 <AnimatePresence>
                   {isPenToolActive && (
                     <motion.div 
                       initial={{ opacity: 0, width: 0 }}
                       animate={{ opacity: 1, width: 'auto' }}
                       exit={{ opacity: 0, width: 0 }}
                       className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-black/5"
                     >
                       {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000'].map(color => (
                         <button
                           key={color}
                           onClick={() => setPenColor(color)}
                           className={cn(
                             "w-6 h-6 rounded-full transition-transform",
                             penColor === color ? "scale-110 ring-2 ring-offset-1 ring-gray-400" : "hover:scale-110"
                           )}
                           style={{ backgroundColor: color }}
                         />
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>

                 <button 
                   onClick={() => setIsPenToolActive(!isPenToolActive)}
                   className={cn("p-2 rounded-xl transition-all", isPenToolActive ? "bg-red-500 text-white" : "hover:bg-brand-bg text-gray-400")}
                   title="أداة القلم"
                 >
                   <Edit3 size={20} />
                 </button>

                 <button 
                   onClick={() => setShowReaderSettings(!showReaderSettings)}
                   className={cn("p-2 rounded-xl transition-all", showReaderSettings ? "bg-brand-olive text-white" : "hover:bg-brand-bg text-gray-400")}
                   title="إعدادات الخط"
                 >
                   <Type size={20} />
                 </button>
                 
                 <AnimatePresence>
                   {showReaderSettings && (
                     <motion.div
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-black/5 p-4 z-[110] font-sans"
                       dir="rtl"
                     >
                       <div className="space-y-4">
                         <div>
                           <label className="text-xs font-bold text-gray-400 block mb-2">حجم الخط ({fontSize}px)</label>
                           <div className="flex items-center gap-3">
                             <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                               <Minus size={14} />
                             </button>
                             <input 
                               type="range" 
                               min="12" 
                               max="48" 
                               value={fontSize} 
                               onChange={(e) => setFontSize(parseInt(e.target.value))}
                               className="flex-1 accent-brand-olive"
                             />
                             <button onClick={() => setFontSize(Math.min(48, fontSize + 2))} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                               <Plus size={14} />
                             </button>
                           </div>
                         </div>

                         <div>
                           <label className="text-xs font-bold text-gray-400 block mb-2">تباعد الأسطر ({lineHeight})</label>
                           <input 
                             type="range" 
                             min="1" 
                             max="3" 
                             step="0.1"
                             value={lineHeight} 
                             onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                             className="w-full accent-brand-olive"
                           />
                         </div>

                         <div>
                           <label className="text-xs font-bold text-gray-400 block mb-2">تباعد الحروف ({letterSpacing}px)</label>
                           <input 
                             type="range" 
                             min="0" 
                             max="5" 
                             step="0.5"
                             value={letterSpacing} 
                             onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                             className="w-full accent-brand-olive"
                           />
                         </div>

                         <div>
                           <label className="text-xs font-bold text-gray-400 block mb-2">محاذاة النص</label>
                           <div className="flex bg-gray-100 p-1 rounded-lg">
                             <button 
                               onClick={() => setTextAlign('justify')}
                               className={cn("flex-1 py-1 rounded text-[10px] font-bold transition-all", textAlign === 'justify' ? "bg-white shadow-sm text-brand-olive" : "text-gray-400")}
                             >
                               ضبط
                             </button>
                             <button 
                               onClick={() => setTextAlign('right')}
                               className={cn("flex-1 py-1 rounded text-[10px] font-bold transition-all", textAlign === 'right' ? "bg-white shadow-sm text-brand-olive" : "text-gray-400")}
                             >
                               يمين
                             </button>
                           </div>
                         </div>
                         
                         <div>
                           <label className="text-xs font-bold text-gray-400 block mb-2">نوع الخط</label>
                           <div className="grid grid-cols-1 gap-2">
                             {[
                               { id: 'font-amiri', name: 'خط الأميري', class: 'font-amiri' },
                               { id: 'font-scheherazade', name: 'خط شهرزاد', class: 'font-scheherazade' },
                               { id: 'font-sans', name: 'خط النظام (Sans)', class: 'font-sans' }
                             ].map(font => (
                               <button
                                 key={font.id}
                                 onClick={() => setFontFamily(font.id)}
                                 className={cn(
                                   "w-full text-right px-3 py-2 rounded-xl border transition-all text-sm",
                                   fontFamily === font.id 
                                     ? "bg-brand-olive text-white border-brand-olive shadow-md" 
                                     : "bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700"
                                 )}
                               >
                                 <span className={font.class}>{font.name}</span>
                               </button>
                             ))}
                           </div>
                         </div>

                         <button 
                           onClick={resetFormatting}
                           className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100"
                         >
                           إعادة ضبط التنسيق
                         </button>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>


               <div className="flex bg-gray-100 p-1 rounded-lg text-[10px] font-bold">
                 <span className="px-2 py-1 bg-white rounded shadow-sm text-brand-olive">النص الرقمي</span>
                 <span className="px-2 py-1 text-gray-400">المخطوط</span>
               </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden relative">
            {/* Heatmap Sidebar */}
            {isSidebarOpen && <HeatmapSidebar />}
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "absolute z-10 p-1 bg-white rounded-full shadow-sm border border-black/5 text-gray-400 hover:text-brand-olive transition-all",
                isSidebarOpen ? "left-[250px] top-2" : "left-2 top-2"
              )}
              title="تبديل الشريط الجانبي"
            >
              {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            <div className="flex-1 flex flex-col p-6">
              <div className="flex items-center justify-between">
              </div>

              <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Digital Text Area */}
                <div className={cn("flex-1 bg-brand-bg/30 rounded-[24px] overflow-hidden border border-black/5 transition-all flex flex-col", showPdfSync ? "w-1/2" : "w-full")}>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <div className="max-w-3xl mx-auto">
                      {selectedBook ? (
                        <InteractiveReader 
                          content={activeVersionId ? (selectedBook.versions?.find(v => v.id === activeVersionId)?.content || selectedBook.content) : selectedBook.content} 
                          fontSize={fontSize} 
                          fontFamily={fontFamily} 
                          lineHeight={lineHeight}
                          letterSpacing={letterSpacing}
                          textAlign={textAlign}
                          bookId={selectedBook.id}
                          chapterId={activeChapter?.id || 'default'}
                          refreshKey={mcqRefreshKey}
                          isPenToolActive={isPenToolActive}
                          penColor={penColor}
                          onSaveAnnotation={(data) => {
                            // Save to DB
                            if (selectedBook) {
                              saveAnnotation({
                                id: `${selectedBook.id}-${activeChapter?.id || 'default'}`,
                                bookId: selectedBook.id,
                                chapterId: activeChapter?.id || 'default',
                                data: data,
                                createdAt: Date.now()
                              });
                            }
                          }}
                          versions={selectedBook.versions}
                          activeVersionId={activeVersionId || undefined}
                          onVersionChange={(id) => setActiveVersionId(id)}
                          selectedModel={selectedModel}
                        />
                      ) : (
                        <div className="text-center text-gray-400 mt-20">جاري تحميل المحتوى...</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Timeline (Conditional based on book type or just show it for demo) */}
                  {/* <Timeline isOpen={isTimelineOpen} onToggle={() => setIsTimelineOpen(!isTimelineOpen)} /> */}
                </div>

                {/* PDF Sync View */}
                <AnimatePresence>
                  {showPdfSync && (
                    <motion.div 
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: '50%', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="bg-gray-200 rounded-[24px] overflow-hidden border border-black/10 flex flex-col"
                    >
                      <div className="p-3 bg-gray-300/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-600">نسخة PDF متزامنة</span>
                        <div className="flex gap-2">
                          <button className="p-1 hover:bg-black/5 rounded text-brand-olive font-bold text-xs flex items-center gap-1" title="تصحيح النص بالذكاء الاصطناعي">
                            <Wand2 size={12} /> تصحيح OCR
                          </button>
                          <button className="p-1 hover:bg-black/5 rounded"><Maximize2 size={12} /></button>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm">
                        <div className="text-center">
                          <FileSearch size={48} className="mx-auto mb-4 opacity-20" />
                          <p>عرض النسخة المصورة (PDF)</p>
                          <p className="text-[10px] mt-2">مزامنة لحظية مع النص الرقمي</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-4">
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-bg rounded-xl text-sm font-medium hover:bg-brand-bg/80 transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-2 px-6 py-2.5 bg-brand-bg rounded-xl text-sm font-medium">
                    {activeChapter?.page_number || 1}
                  </div>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-bg rounded-xl text-sm font-medium hover:bg-brand-bg/80 transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <Activity size={14} className="text-emerald-500" />
                  <span>مستوى النشاط في هذه الصفحة: مرتفع</span>
                </div>

                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-bg rounded-xl text-sm font-medium hover:bg-brand-bg/80 transition-all text-brand-olive border border-brand-olive/20" title="البحث عن درجة الحديث وربطها بالمتن">
                    <Network size={16} /> تخريج آلي
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-bg rounded-xl text-sm font-medium hover:bg-brand-bg/80 transition-all">
                    <Edit3 size={16} /> ملاحظات
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-bg rounded-xl text-sm font-medium hover:bg-brand-bg/80 transition-all">
                    <Share2 size={16} /> مشاركة
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-bg rounded-xl text-sm font-medium hover:bg-brand-bg/80 transition-all">
                    <Copy size={16} /> نسخ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      </div>

      {/* 3. Status Bar */}
      <footer className="h-7 bg-white/80 backdrop-blur-md border-t border-black/5 flex items-center justify-between px-4 text-[10px] text-gray-500 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="font-medium">Ollama: جاهز (Llama 3)</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <BookIcon size={12} />
            <span>1,240 كتاب</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <FileText size={12} />
            <span>45,890 صفحة مؤرشفة</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>معالجة الفهرس الدلالي:</span>
            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-black/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                className="h-full bg-brand-olive"
              />
            </div>
            <span className="font-bold text-brand-olive">65%</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <span>v1.0.4-beta</span>
        </div>
      </footer>

      {/* Omni-Search (Spotlight) */}
      <AnimatePresence>
        {omniSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4"
            onClick={() => setOmniSearchOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[70vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-black/5 flex items-center gap-4 bg-gradient-to-r from-brand-olive/5 to-transparent shrink-0">
                <Sparkles className="text-brand-olive" size={24} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="اسأل المكتبة (بحث دلالي RAG)... مثال: ما رأي الشافعية في زكاة الحلي؟"
                  className="flex-1 bg-transparent border-none outline-none text-xl font-amiri text-right placeholder:text-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setIsSearching(true);
                      try {
                        const embedding = await geminiService.generateEmbedding(searchQuery);
                        const localChunks = await searchChunks(embedding, 10);
                        
                        const resultsWithTitles = await Promise.all(localChunks.map(async (chunk) => {
                          const book = await getBook(chunk.book_id);
                          return { ...chunk, bookTitle: book?.title || 'Unknown Book' };
                        }));
                        
                        setSearchResults(resultsWithTitles as any);
                      } catch (err) {
                        console.error("Search error:", err);
                      } finally {
                        setIsSearching(false);
                      }
                    }
                  }}
                />
                <VoiceSearch onResult={(text) => setSearchQuery(text)} />
                <div className="px-3 py-1 bg-brand-olive/10 text-brand-olive rounded-lg text-xs font-bold flex items-center gap-1 font-sans">
                  <Network size={14} /> Semantic
                </div>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-olive" />
                    <p>جاري البحث في الفهرس الدلالي...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2 p-4">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 px-2">نتائج البحث الدلالي ({searchResults.length})</h3>
                    {searchResults.map((result, idx) => (
                      <div key={idx} className="p-4 rounded-xl hover:bg-brand-bg/50 transition-colors cursor-pointer border border-transparent hover:border-black/5"
                           onClick={() => {
                             // Find the book and select it
                             const book = books.find(b => b.id === result.book_id);
                             if (book) {
                               handleBookSelect(book);
                               setOmniSearchOpen(false);
                             }
                           }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-brand-olive bg-brand-olive/10 px-2 py-1 rounded-md">
                            {result.bookTitle}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            التطابق: {Math.round((result.similarity || 0) * 100)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                          {result.content || (result as any).content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-12 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>اضغط Enter للبحث</p>
                  </div>
                ) : (
                  <div className="p-4 max-h-[400px] overflow-y-auto">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">نتائج سريعة</p>
                    <div className="space-y-1">
                      <OmniResult icon={<BookIcon size={16} />} title="تفسير الطبري" subtitle="كتاب • الإمام الطبري" />
                      <OmniResult icon={<MessageSquare size={16} />} title="ما هو تعريف الفقه؟" subtitle="سؤال للذكاء الاصطناعي" />
                      <OmniResult icon={<User size={16} />} title="ابن تيمية" subtitle="مؤلف • 54 كتاب متوفر" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-black/5 flex items-center justify-between text-[10px] text-gray-400 shrink-0">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><kbd className="bg-white border px-1 rounded">↵</kbd> فتح</span>
                  <span className="flex items-center gap-1"><kbd className="bg-white border px-1 rounded">↑↓</kbd> تنقل</span>
                </div>
                <span>المكتبة الشاملة الذكية</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Library Explorer Modal */}
      <AnimatePresence>
        {showLibraryExplorer && (
          <LibraryExplorer 
            books={books} 
            onClose={() => setShowLibraryExplorer(false)} 
            onSelectBook={(book) => {
              handleBookSelect(book);
              setShowLibraryExplorer(false);
            }} 
          />
        )}
      </AnimatePresence>

      {/* System Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SystemSettingsModal 
            onClose={() => setShowSettings(false)} 
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />
        )}
      </AnimatePresence>

      {/* Auto Mindmap Modal */}
      <AnimatePresence>
        {showMindmap && selectedBook && (
          <AutoMindmapModal 
            content={selectedBook.content} 
            title={activeChapter?.title || selectedBook.title} 
            onClose={() => setShowMindmap(false)} 
            selectedModel={selectedModel}
          />
        )}
      </AnimatePresence>

      {/* Library Manager Modal */}
      <AnimatePresence>
        {isLibraryManagerOpen && (
          <LibraryManager 
            isOpen={isLibraryManagerOpen} 
            onClose={() => setIsLibraryManagerOpen(false)} 
            onSelectBook={handleBookSelect as any}
            onLibraryUpdate={fetchBooks}
            onShowOCR={() => {
              setIsLibraryManagerOpen(false);
              setShowOCRModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUploadModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-brand-olive font-amiri">إضافة محتوى جديد</h2>
                  <button onClick={() => setUploadModalOpen(false)} className="p-2 hover:bg-brand-bg rounded-full"><X size={20} /></button>
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Upload size={16} /> رفع ملف (PDF, Word, EPUB)
                    </h3>
                    <form onSubmit={handleFileUpload} className="space-y-4">
                      <input type="text" name="title" placeholder="عنوان الكتاب" className="w-full bg-brand-bg rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" required />
                      <input type="file" name="file" accept=".pdf,.docx,.txt,.epub" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-olive/10 file:text-brand-olive hover:file:bg-brand-olive/20" required />
                      <button 
                        type="submit" 
                        disabled={isUploading}
                        className="w-full py-3 bg-brand-olive text-white rounded-xl font-bold hover:bg-brand-olive-light transition-all flex items-center justify-center gap-2"
                      >
                        {isUploading ? <Loader2 className="animate-spin" size={20} /> : "رفع ومعالجة"}
                      </button>
                    </form>
                  </section>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink mx-4 text-gray-300 text-xs uppercase font-bold">أو</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                  </div>

                  <section>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Globe size={16} /> استيراد من رابط
                    </h3>
                    <form onSubmit={handleScrape} className="space-y-4">
                      <input type="text" name="title" placeholder="عنوان الصفحة" className="w-full bg-brand-bg rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" required />
                      <input type="url" name="url" placeholder="https://example.com/article" className="w-full bg-brand-bg rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-olive/20" required />
                      <button 
                        type="submit" 
                        disabled={isScraping}
                        className="w-full py-3 border-2 border-brand-olive text-brand-olive rounded-xl font-bold hover:bg-brand-olive/5 transition-all flex items-center justify-center gap-2"
                      >
                        {isScraping ? <Loader2 className="animate-spin" size={20} /> : "استيراد المحتوى"}
                      </button>
                    </form>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AIResearchAssistant 
        isOpen={showAIAssistant} 
        onClose={() => setShowAIAssistant(false)} 
      />

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAIAssistant(true)}
        className="fixed bottom-8 left-8 w-14 h-14 bg-brand-olive text-white rounded-2xl shadow-2xl flex items-center justify-center z-[90] hover:bg-brand-olive/90 transition-all group"
      >
        <Sparkles size={24} />
        <span className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-sans">
          المساعد البحثي الذكي
        </span>
      </motion.button>

      <OCRModal 
        isOpen={showOCRModal} 
        onClose={() => setShowOCRModal(false)}
        onExtract={(text) => {
          setSearchQuery(text);
          setOmniSearchOpen(true);
          setShowOCRModal(false);
        }}
        onSaveToLibrary={handleSaveOCRToLibrary}
      />
      </div>
    </div>
  );
}

function OmniResult({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) {
  return (
    <button className="w-full flex items-center gap-4 p-3 hover:bg-brand-olive/5 rounded-xl transition-colors text-right group">
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-brand-olive group-hover:bg-brand-olive/10 transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[10px] text-gray-400">{subtitle}</p>
      </div>
      <ChevronLeft size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function MenuDropdown({ label, isOpen, onClick, items }: { 
  label: string, 
  isOpen: boolean, 
  onClick: () => void,
  items: Array<{ label?: string, icon?: React.ReactNode, onClick?: () => void, type?: 'divider' }>
}) {
  return (
    <div className="relative">
      <button 
        onClick={onClick}
        className={`px-2 py-1 rounded hover:bg-black/5 transition-colors ${isOpen ? 'bg-black/5' : ''}`}
      >
        {label}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full right-0 mt-1 w-56 bg-white border border-black/5 rounded-xl shadow-xl py-2 z-[60]"
          >
            {items.map((item, i) => (
              item.type === 'divider' ? (
                <div key={i} className="h-px bg-black/5 my-1" />
              ) : (
                <button 
                  key={i}
                  onClick={() => { item.onClick?.(); onClick(); }}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-brand-olive/5 text-right group transition-colors"
                >
                  <span className="text-gray-400 group-hover:text-brand-olive transition-colors">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </button>
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavTab({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2 rounded-[14px] transition-all text-sm font-bold",
        active 
          ? "bg-white text-brand-olive shadow-sm" 
          : "text-gray-500 hover:text-brand-olive hover:bg-white/50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TreeItem({ label, active, onClick }: { label: string, active?: boolean, onClick?: () => void, key?: any }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "py-1.5 px-3 rounded-xl text-sm cursor-pointer transition-all text-right",
        active ? "bg-brand-olive/10 text-brand-olive font-bold" : "text-gray-500 hover:bg-brand-bg"
      )}
    >
      {label}
    </div>
  );
}

function MindMap({ books, relationships, onSelect }: { books: Book[], relationships: BookRelationship[], onSelect: (book: Book) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || books.length === 0) return;

    const width = 300;
    const height = 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = books.map(b => ({ id: b.id, title: b.title, category: b.category }));
    const links = relationships.map(r => ({ source: r.source, target: r.target, type: r.type }));

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", (d: any) => d.type === 'footnote' ? "3,3" : "0");

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 6)
      .attr("fill", (d: any) => {
        if (d.category === 'فقه') return '#5A5A40';
        if (d.category === 'تفسير') return '#3b82f6';
        return '#f59e0b';
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("click", (event, d: any) => {
        const book = books.find(b => b.id === d.id);
        if (book) onSelect(book);
      })
      .style("cursor", "pointer");

    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: any) => d.title.substring(0, 10) + "...")
      .attr("font-size", "8px")
      .attr("text-anchor", "middle")
      .attr("dy", -10)
      .attr("fill", "#666");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    return () => simulation.stop();
  }, [books, relationships]);

  return (
    <div className="w-full h-full bg-brand-bg/20 rounded-2xl border border-black/5 overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" viewBox="0 0 300 400" />
    </div>
  );
}

function HeatmapSidebar() {
  return (
    <div className="w-4 h-full bg-gray-50 border-r border-black/5 flex flex-col py-10 gap-1 opacity-60 hover:opacity-100 transition-opacity">
      {[...Array(40)].map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "w-full h-1 rounded-sm",
            i % 7 === 0 ? "bg-brand-olive/80" : 
            i % 5 === 0 ? "bg-brand-olive/40" : 
            "bg-brand-olive/10"
          )}
          title={`كثافة النتائج: ${i % 7 === 0 ? 'عالية' : 'منخفضة'}`}
        />
      ))}
    </div>
  );
}

function ResearchEditor({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full font-amiri" dir="rtl">
      <div className="h-14 bg-white border-b border-black/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <PenTool size={20} className="text-brand-olive" />
          <h2 className="font-bold text-gray-800 font-sans">محرر البحث الذكي</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-brand-olive text-white rounded-lg text-sm font-medium flex items-center gap-2 font-sans hover:bg-brand-olive/90 transition-colors">
            <Wand2 size={16} /> صياغة الحواشي
          </button>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-black/5 p-8 flex flex-col overflow-hidden">
          <input 
            type="text" 
            placeholder="عنوان البحث..." 
            className="text-3xl font-bold font-amiri border-none outline-none mb-6 placeholder:text-gray-300" 
          />
          <textarea 
            placeholder="ابدأ الكتابة هنا... سيقوم الذكاء الاصطناعي باقتراح المراجع وتنسيق الهوامش تلقائياً." 
            className="flex-1 resize-none border-none outline-none font-amiri text-lg leading-loose text-gray-800 placeholder:text-gray-300 custom-scrollbar" 
          />
        </div>
        <div className="w-80 bg-white rounded-2xl shadow-sm border border-black/5 p-6 flex flex-col shrink-0 overflow-hidden">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 font-sans text-sm">
            <Sparkles size={18} className="text-amber-500" />
            اقتراحات المراجع (RAG)
          </h3>
          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-sm text-amber-900 mb-2 font-medium font-sans">بناءً على ما تكتبه عن "زكاة الحلي":</p>
              <p className="text-xs text-amber-800/80 mb-3 font-sans leading-relaxed">وجدنا 3 نصوص مشابهة في المذهب الشافعي تتحدث عن نفس المسألة.</p>
              <button className="text-xs bg-white px-3 py-2 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-100 w-full transition-colors font-sans font-medium flex items-center justify-center gap-2">
                <FileCheck size={14} /> إدراج كحاشية
              </button>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-sm text-blue-900 mb-2 font-medium font-sans">اقتراح صياغة:</p>
              <p className="text-xs text-blue-800/80 mb-3 font-sans leading-relaxed">يمكنك الاستدلال بحديث "ليس فيما دون خمس أواق صدقة" لتقوية حجتك.</p>
              <button className="text-xs bg-white px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-100 w-full transition-colors font-sans font-medium flex items-center justify-center gap-2">
                <GitMerge size={14} /> دمج في النص
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemSettingsModal({ onClose, selectedModel, setSelectedModel }: { onClose: () => void, selectedModel: string, setSelectedModel: (model: string) => void }) {
  const [activeTab, setActiveTab] = useState<'data' | 'processing' | 'ai'>('data');

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-4xl h-[600px] flex overflow-hidden shadow-2xl border border-black/10"
        dir="rtl"
      >
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-l border-black/5 flex flex-col p-4">
          <div className="flex items-center gap-2 mb-8 px-2">
            <Settings className="text-brand-olive" size={24} />
            <h2 className="text-xl font-bold font-amiri">إعدادات النظام</h2>
          </div>
          
          <div className="flex flex-col gap-2 font-sans text-sm">
            <button 
              onClick={() => setActiveTab('data')}
              className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right", activeTab === 'data' ? "bg-white shadow-sm text-brand-olive font-bold" : "text-gray-600 hover:bg-black/5")}
            >
              <FolderOpen size={18} /> إدارة البيانات
            </button>
            <button 
              onClick={() => setActiveTab('processing')}
              className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right", activeTab === 'processing' ? "bg-white shadow-sm text-brand-olive font-bold" : "text-gray-600 hover:bg-black/5")}
            >
              <Cpu size={18} /> معالجة النصوص
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right", activeTab === 'ai' ? "bg-white shadow-sm text-brand-olive font-bold" : "text-gray-600 hover:bg-black/5")}
            >
              <Brain size={18} /> محرك الذكاء الاصطناعي
            </button>
          </div>

          <div className="mt-auto pt-4 border-t border-black/5">
            <button onClick={onClose} className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors">
              إغلاق
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white font-sans">
          {activeTab === 'data' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">الحصول على البيانات (The Data)</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  بدلاً من محاولة فك تشفير البرنامج الرسمي، يمكنك الحصول على نصوص الكتب من مصادر توفرها بصيغ قابلة للقراءة برمجياً.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-5 border border-black/10 rounded-2xl hover:border-brand-olive/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold flex items-center gap-2"><FileText size={18} className="text-blue-500" /> مشروع المكتبة الشاملة (JSON/Markdown)</h4>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">مستحسن</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">استيراد الكتب من مستودعات GitHub التي قامت بتحويل آلاف كتب الشاملة إلى صيغ حديثة مثل JSON أو SQLite.</p>
                  <button className="text-sm bg-black/5 hover:bg-black/10 px-4 py-2 rounded-lg font-medium transition-colors">استيراد قاعدة بيانات (SQLite/JSON)</button>
                </div>

                <div className="p-5 border border-black/10 rounded-2xl hover:border-brand-olive/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold flex items-center gap-2"><Globe size={18} className="text-emerald-500" /> المكتبة الشاملة الحديثة (Open Source)</h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">مزامنة مع مشاريع مثل "Shamela-JS" أو النسخ التي تعتمد على الويب.</p>
                  <button className="text-sm bg-black/5 hover:bg-black/10 px-4 py-2 rounded-lg font-medium transition-colors">إعداد المزامنة (API)</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'processing' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">معالجة النصوص (Text Processing)</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  بما أن نصوص الكتب التراثية تحتوي على تشكيل وزخارف، يجب تنظيفها وتقسيمها لتعمل بكفاءة مع الذكاء الاصطناعي.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-5 border border-black/10 rounded-2xl">
                  <h4 className="font-bold mb-4 flex items-center gap-2"><Filter size={18} /> تنظيف البيانات (Data Cleaning)</h4>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2">
                    <div>
                      <p className="text-sm font-bold">إزالة التشكيل للبحث</p>
                      <p className="text-xs text-gray-500">تجريد النصوص من الحركات لتسهيل البحث الدلالي (Embeddings).</p>
                    </div>
                    <div className="w-12 h-6 bg-brand-olive rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform translate-x-6" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold">الاحتفاظ بالتشكيل للعرض</p>
                      <p className="text-xs text-gray-500">عرض النصوص المشكولة للمستخدم في واجهة القراءة.</p>
                    </div>
                    <div className="w-12 h-6 bg-brand-olive rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform translate-x-6" />
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-black/10 rounded-2xl">
                  <h4 className="font-bold mb-4 flex items-center gap-2"><Layers size={18} /> التقسيم (Chunking)</h4>
                  <p className="text-xs text-gray-500 mb-4">تقسيم الكتاب إلى فقرات صغيرة مع الحفاظ على "السياق" (اسم الكتاب، الفصل، الصفحة) لربطها ببعضها لاحقاً.</p>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold">حجم الفقرة (Chunk Size)</span>
                      <span className="text-brand-olive font-bold">500 كلمة</span>
                    </div>
                    <input type="range" min="100" max="1000" defaultValue="500" className="w-full accent-brand-olive" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 text-blue-800 p-3 rounded-xl">
                    <Info size={16} /> يتم حقن البيانات الوصفية (Metadata) تلقائياً في كل فقرة.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">بناء "العقل" (The AI Engine)</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  إعدادات معمارية RAG (Retrieval-Augmented Generation) للبحث الدلالي وتلخيص الكتب.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-5 border border-black/10 rounded-2xl">
                  <h4 className="font-bold mb-4 flex items-center gap-2"><Network size={18} /> نموذج التضمين (Embeddings Model)</h4>
                  <p className="text-xs text-gray-500 mb-4">تحويل النص العربي إلى أرقام (Vectors).</p>
                  <select className="w-full p-3 bg-gray-50 border border-black/10 rounded-xl text-sm font-medium outline-none focus:border-brand-olive">
                    <option>BGE-M3 (مستحسن - يدعم العربية بقوة)</option>
                    <option>Cohere Multilingual</option>
                    <option>OpenAI text-embedding-3-large</option>
                  </select>
                </div>

                <div className="p-5 border border-black/10 rounded-2xl">
                  <h4 className="font-bold mb-4 flex items-center gap-2"><Database size={18} /> قاعدة البيانات المتجهة (Vector Database)</h4>
                  <p className="text-xs text-gray-500 mb-4">تخزين الأرقام للبحث بـ "المعنى" وليس فقط بـ "الكلمة".</p>
                  <select className="w-full p-3 bg-gray-50 border border-black/10 rounded-xl text-sm font-medium outline-none focus:border-brand-olive">
                    <option>ChromaDB (محلي)</option>
                    <option>Qdrant (محلي/سحابي)</option>
                    <option>Pinecone (سحابي)</option>
                  </select>
                </div>

                <div className="p-5 border border-black/10 rounded-2xl">
                  <h4 className="font-bold mb-4 flex items-center gap-2"><Cpu size={18} /> النموذج اللغوي الكبير (LLM)</h4>
                  <p className="text-xs text-gray-500 mb-4">لاستخراج الإجابات وتلخيص الكتب.</p>
                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-black/10 rounded-xl text-sm font-medium outline-none focus:border-brand-olive"
                  >
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                    <option value="ollama">Ollama</option>
                    <option value="lm-studio">LM Studio</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function LibraryExplorer({ 
  books, 
  onClose, 
  onSelectBook 
}: { 
  books: Book[], 
  onClose: () => void, 
  onSelectBook: (book: Book) => void 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCentury, setSelectedCentury] = useState<number | null>(null);
  const [selectedMadhhab, setSelectedMadhhab] = useState<string | null>(null);
  const [pdfOnly, setPdfOnly] = useState(false);
  const [aiReadyOnly, setAiReadyOnly] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [hoveredBook, setHoveredBook] = useState<Book | null>(null);
  const [bookToSelectEdition, setBookToSelectEdition] = useState<Book | null>(null);

  const centuries = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const madhhabs = ['فقه شافعي', 'فقه حنفي', 'فقه مالكي', 'فقه حنبلي', 'عقيدة سلفية', 'نحو / مدرسة البصرة', 'أصول فقه / مالكي'];
  
  const shelves = [
    { id: 's1', name: 'أدلة رسالة الماجستير' },
    { id: 's2', name: 'مراجعات العقيدة' }
  ];

  // Filter books
  const filteredBooks = books.filter(book => {
    if (searchQuery && !book.title.includes(searchQuery) && !book.author.includes(searchQuery)) return false;
    if (selectedCentury && book.century !== selectedCentury) return false;
    if (selectedMadhhab && book.madhhab !== selectedMadhhab) return false;
    if (pdfOnly && !book.has_pdf) return false;
    if (aiReadyOnly && !book.is_indexed) return false;
    return true;
  });

  // Calculate relevance if searching
  const booksWithRelevance = filteredBooks.map(book => ({
    ...book,
    relevance: searchQuery ? Math.floor(Math.random() * 40) + 60 : undefined // Mock relevance
  })).sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8 font-amiri">
      <div className="bg-white w-full max-w-7xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="h-16 border-b border-black/5 flex items-center justify-between px-6 shrink-0 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-olive/10 rounded-xl flex items-center justify-center text-brand-olive">
              <Library size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">تصفح المكتبة الذكية</h2>
              <p className="text-xs text-gray-500">نظام الترشيح والاختيار المتقدم</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Filters */}
          <div className="w-72 border-l border-black/5 bg-gray-50/50 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
            
            {/* Virtual Shelves */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FolderOpen size={16} className="text-brand-olive" />
                الرفوف الافتراضية
              </h3>
              <div className="space-y-2">
                {shelves.map(shelf => (
                  <button 
                    key={shelf.id}
                    onClick={() => setSelectedShelf(selectedShelf === shelf.id ? null : shelf.id)}
                    className={cn(
                      "w-full text-right px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedShelf === shelf.id ? "bg-brand-olive text-white" : "hover:bg-black/5 text-gray-600"
                    )}
                  >
                    {shelf.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Filter size={16} className="text-brand-olive" />
                الفلترة المتقدمة
              </h3>
              
              <div className="space-y-6">
                {/* Century Filter */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block">القرن الهجري</label>
                  <select 
                    className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-olive"
                    value={selectedCentury || ''}
                    onChange={(e) => setSelectedCentury(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">الكل</option>
                    {centuries.map(c => <option key={c} value={c}>القرن {c} هـ</option>)}
                  </select>
                </div>

                {/* Madhhab Filter */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block">المدرسة / المذهب</label>
                  <select 
                    className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-olive"
                    value={selectedMadhhab || ''}
                    onChange={(e) => setSelectedMadhhab(e.target.value || null)}
                  >
                    <option value="">الكل</option>
                    {madhhabs.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block">حالة البيانات</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={pdfOnly} onChange={(e) => setPdfOnly(e.target.checked)} className="rounded text-brand-olive focus:ring-brand-olive" />
                      <span>نسخة مصورة PDF متوفرة</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={aiReadyOnly} onChange={(e) => setAiReadyOnly(e.target.checked)} className="rounded text-brand-olive focus:ring-brand-olive" />
                      <span>مجهز للبحث الذكي</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Search Bar */}
            <div className="p-6 border-b border-black/5">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="ابحث عن كتاب، مؤلف، أو مسألة علمية..."
                  className="w-full bg-gray-50 border border-black/5 rounded-2xl py-4 pr-12 pl-12 focus:outline-none focus:ring-2 focus:ring-brand-olive/20 focus:border-brand-olive text-lg transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <VoiceSearch onResult={(text) => setSearchQuery(text)} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {/* Contextual Recommendations */}
              {!searchQuery && !selectedShelf && !selectedCentury && !selectedMadhhab && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-amber-500" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">ترشيحات ذكية لك</h3>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                    <p className="text-sm text-amber-800 mb-4">بناءً على قراءاتك الأخيرة في "أصول الفقه"، قد يهمك الاطلاع على:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {books.filter(b => b.madhhab?.includes('أصول')).slice(0, 3).map(book => (
                        <div key={book.id} onClick={() => onSelectBook(book)} className="bg-white/60 hover:bg-white p-3 rounded-xl cursor-pointer transition-colors border border-amber-200/50">
                          <h4 className="font-bold text-amber-900 text-sm">{book.title}</h4>
                          <p className="text-xs text-amber-700/70">{book.author}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Book Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {booksWithRelevance.map(book => (
                  <div 
                    key={book.id} 
                    className="relative group"
                    onMouseEnter={() => setHoveredBook(book)}
                    onMouseLeave={() => setHoveredBook(null)}
                  >
                    <div 
                      onClick={() => {
                        if (book.editions && book.editions.length > 0) {
                          setBookToSelectEdition(book);
                        } else {
                          onSelectBook(book);
                        }
                      }}
                      className="p-5 border border-black/5 rounded-2xl hover:border-brand-olive/50 hover:shadow-lg cursor-pointer transition-all bg-white h-full flex flex-col"
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1 leading-tight">{book.title}</h3>
                        <p className="text-sm text-gray-500 mb-3">{book.author}</p>
                        
                        {book.relevance && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md mb-3">
                            <Target size={12} /> نسبة التطابق: {book.relevance}%
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                        {book.is_indexed && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md">مفهرس ذكياً</span>}
                        {book.has_pdf && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md">PDF</span>}
                        {book.editions && book.editions.length > 0 && (
                          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-md flex items-center gap-1">
                            <Eye size={10} /> {book.editions.length} طبعات
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Smart Book Card (Hover) */}
                    <AnimatePresence>
                      {hoveredBook?.id === book.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 bottom-full mb-3 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-black/10 p-5 pointer-events-none"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-gray-900 text-base">{book.title}</h4>
                              <p className="text-xs text-gray-500">{book.author} {book.author_death_year ? `(ت: ${book.author_death_year}هـ)` : ''}</p>
                            </div>
                            <div className="bg-brand-olive/10 text-brand-olive p-2 rounded-lg shrink-0">
                              <Sparkles size={16} />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 mb-1">ملخص الذكاء الاصطناعي</p>
                              <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{book.ai_summary || 'لا يوجد ملخص متاح.'}</p>
                            </div>
                            
                            {book.scientific_status && (
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 mb-1">المكانة العلمية</p>
                                <p className="text-xs text-brand-olive font-medium bg-brand-olive/5 p-2 rounded-lg border border-brand-olive/10">
                                  {book.scientific_status}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex gap-4 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Search size={12} />
                                <span>{book.usage_stats?.searches || 0} عملية بحث</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Edit3 size={12} />
                                <span>{book.usage_stats?.notes || 0} ملاحظة</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              
              {booksWithRelevance.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <BookIcon size={48} className="mx-auto mb-4 opacity-20" />
                  <p>لم يتم العثور على كتب تطابق بحثك</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edition Selection Modal */}
      <AnimatePresence>
        {bookToSelectEdition && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl" 
              dir="rtl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">اختر الطبعة المعتمدة</h3>
                  <p className="text-sm text-gray-500">كتاب "{bookToSelectEdition.title}" متوفر بعدة طبعات، اختر الطبعة التي تفضلها.</p>
                </div>
                <button onClick={() => setBookToSelectEdition(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookToSelectEdition.editions?.map(edition => (
                  <div 
                    key={edition.id}
                    onClick={() => {
                      onSelectBook(bookToSelectEdition);
                      setBookToSelectEdition(null);
                      onClose();
                    }}
                    className="border-2 border-transparent hover:border-brand-olive rounded-2xl p-4 cursor-pointer transition-all bg-gray-50 hover:bg-brand-olive/5 flex gap-4 group"
                  >
                    <div className="w-24 h-32 bg-gray-200 rounded-lg shadow-md overflow-hidden shrink-0 relative">
                      {edition.cover_url ? (
                        <img src={edition.cover_url} alt="غلاف" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <BookIcon size={24} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-bold text-gray-900 mb-1">{edition.publisher}</h4>
                      {edition.investigator && <p className="text-xs text-gray-500 mb-3">تحقيق: {edition.investigator}</p>}
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit mt-auto">
                        <CheckCircle2 size={10} /> طبعة معتمدة
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickAction({ label }: { label: string }) {
  return (
    <button className="px-4 py-2 bg-brand-bg rounded-full text-xs font-medium text-gray-600 hover:bg-brand-olive/10 hover:text-brand-olive transition-all border border-black/5">
      {label}
    </button>
  );
}
