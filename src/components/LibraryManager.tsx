import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, FileText, Book as BookIcon, Trash2, Tag, Loader2, BrainCircuit, CheckCircle2, Globe, FolderSync, Clock, Link, Zap, Search, Activity, Network, Sparkles } from 'lucide-react';
import { dbService } from '../services/db';
import { Book } from '../types';
import { geminiService } from '../services/geminiService';
import { cn } from '../utils';
import { Tooltip } from './Tooltip';

interface LibraryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook?: (book: Book) => void;
  onLibraryUpdate?: () => void;
  onShowOCR?: () => void;
}

interface ProcessingJob {
  id: string;
  name: string;
  progress: number;
  status: 'extracting' | 'embedding' | 'indexing' | 'done' | 'error';
  type: 'file' | 'web' | 'sync' | 'crawl';
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ isOpen, onClose, onSelectBook, onLibraryUpdate, onShowOCR }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'browse'>('dashboard');
  const [books, setBooks] = useState<Book[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeTitle, setScrapeTitle] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);

  const fetchBooks = async () => {
    try {
      const allBooks = await dbService.getBooks();
      setBooks(allBooks.sort((a: any, b: any) => b.dateAdded - a.dateAdded));
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs');
      const backendJobs = await response.json();
      if (Array.isArray(backendJobs)) {
        setJobs(backendJobs.map((bj: any) => ({
          id: bj.id,
          name: bj.name,
          progress: bj.progress || 0,
          status: bj.status === 'running' ? 'embedding' : 
                  bj.status === 'done' ? 'done' : 
                  bj.status === 'error' ? 'error' : 'extracting',
          type: bj.type || 'file'
        })));
        
        // If all jobs are done/error, we can stop or just let the interval run
        if (backendJobs.some((j: any) => j.status === 'running' || j.status === 'pending')) {
          // Keep polling
        } else {
          fetchBooks(); // Refresh books when jobs finish
        }
      }
    } catch (err) {
      console.error("Fetch jobs error:", err);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isOpen) {
      fetchJobs();
      interval = setInterval(fetchJobs, 3000);
    }
    return () => clearInterval(interval);
  }, [isOpen, fetchJobs]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ""));
        
        const result = await dbService.uploadFile(formData);
        if (result.jobId) {
          fetchJobs(); // Instant update
        }
        
        if (onLibraryUpdate) onLibraryUpdate();
      } catch (error: any) {
        console.error("Upload error:", error);
      }
    }
  }, [onLibraryUpdate, fetchJobs]);

  const handleScrape = async () => {
    if (!scrapeUrl) return;
    setIsScraping(true);
    try {
      const result = await dbService.scrapeUrl(scrapeUrl, scrapeTitle);
      if (result.jobId) fetchJobs();
      setScrapeUrl('');
      setScrapeTitle('');
    } catch (err) {
      console.error("Scrape error:", err);
    } finally {
      setIsScraping(false);
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl) return;
    setIsCrawling(true);
    try {
      const result = await dbService.crawlUrl(crawlUrl, 5); 
      if (result.jobId) fetchJobs();
      setCrawlUrl('');
    } catch (err) {
      console.error("Crawl error:", err);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذا الكتاب؟')) {
      await dbService.deleteBook(id);
      fetchBooks();
      if (onLibraryUpdate) onLibraryUpdate();
    }
  };

  const handleSelectBook = (book: Book) => {
    if (onSelectBook) {
      onSelectBook(book);
      onClose();
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/epub+zip': ['.epub'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf']
    }
  } as any);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
        className="relative w-full max-w-5xl h-[85vh] bg-[#fdfbf7] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-black/10 font-amiri"
      >
        {/* Header */}
        <div className="p-8 border-b border-black/5 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-olive rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-olive/20 animate-pulse-slow">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-none">بوابة البيانات الذكية</h2>
              <p className="text-xs text-gray-400 font-sans mt-1 tracking-wider uppercase font-bold">Smart Import & Knowledge ETL Dashboard</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-2xl font-sans text-xs font-bold">
            <Tooltip content="عرض لوحة التحكم والاستيراد">
              <button onClick={() => setActiveTab('dashboard')} className={cn("px-6 py-2.5 rounded-xl transition-all", activeTab === 'dashboard' ? "bg-white text-brand-olive shadow-sm" : "text-gray-400 hover:text-gray-600")}>المعرض الأساسي</button>
            </Tooltip>
            <Tooltip content="تصفح قائمة الكتب المتاحة">
              <button onClick={() => setActiveTab('browse')} className={cn("px-6 py-2.5 rounded-xl transition-all", activeTab === 'browse' ? "bg-white text-brand-olive shadow-sm" : "text-gray-400 hover:text-gray-600")}>تصفح المكتبة</button>
            </Tooltip>
          </div>

          <Tooltip content="إغلاق مدير المكتبة">
            <button onClick={onClose} title="إغلاق" className="p-2 hover:bg-black/5 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative bg-white/50">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div key="dash" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                
                {/* 1. Functional Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Card: Local Import */}
                  <Tooltip content="اسحب وأفلت الملفات هنا لرفعها مباشرة" position="bottom">
                    <div {...getRootProps()} className={cn(
                      "group relative overflow-hidden bg-white border-2 border-dashed rounded-[32px] p-8 transition-all hover:border-brand-olive hover:shadow-2xl hover:shadow-brand-olive/5 cursor-pointer",
                      isDragActive ? "border-brand-olive bg-brand-olive/5 scale-[0.98]" : "border-black/5"
                    )}>
                      <input {...getInputProps()} />
                      <div className="relative z-10">
                        <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <UploadCloud size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">استيراد محلي</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">اسحب ملفات PDF أو Word أو نصوص. سيقوم الذكاء الاصطناعي باستخراج المحتوى وفهرسته دلالياً.</p>
                        <div className="mt-6 flex gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase font-sans">PDF</span>
                          <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase font-sans">DOCX</span>
                        </div>
                      </div>
                      {isDragActive && (
                        <div className="absolute inset-0 bg-brand-olive/10 backdrop-blur-sm flex items-center justify-center">
                          <p className="text-brand-olive font-bold text-xl animate-bounce">أفلت الملفات الآن</p>
                        </div>
                      )}
                    </div>
                  </Tooltip>

                  {/* Card: Web Scraper */}
                  <div className="bg-gradient-to-br from-brand-olive to-brand-olive/80 rounded-[32px] p-8 text-white shadow-xl shadow-brand-olive/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><Globe size={180} /></div>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6"><Link size={24} /></div>
                      <h3 className="text-xl font-bold mb-2">كاشط الويب الذكي</h3>
                      <p className="text-sm text-white/70 leading-relaxed mb-6">أدخل رابط مقال أو صفحة علمية لتحويلها فوراً إلى مرجع رقمي ذكي في مكتبتك.</p>
                      
                      <div className="space-y-3 mt-auto">
                        <Tooltip content="أدخل عنواناً للمرجع لتسهيل البحث عنه لاحقاً" position="top">
                          <input 
                            type="text" 
                            placeholder="عنوان المرجع..." 
                            value={scrapeTitle}
                            onChange={e => setScrapeTitle(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-white/40 focus:bg-white/20 transition-all font-sans"
                          />
                        </Tooltip>
                        <div className="flex gap-2">
                          <Tooltip content="أدخل رابط الصفحة (URL) المراد استيراد محتواها" position="top">
                            <input 
                              type="text" 
                              placeholder="https://example.com/article" 
                              value={scrapeUrl}
                              onChange={e => setScrapeUrl(e.target.value)}
                              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-white/40 focus:bg-white/20 transition-all font-sans"
                            />
                          </Tooltip>
                          <Tooltip content="بدء عملية كشط المحتوى" position="top">
                            <button 
                              onClick={handleScrape}
                              disabled={!scrapeUrl || isScraping}
                              className="p-3 bg-white text-brand-olive rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {isScraping ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Smart Crawler */}
                  <div className="bg-white border border-black/5 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-emerald-400">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                      <Network size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">الزاحف الذكي (Spider)</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">تتبع الروابط آلياً لجرد وتنزيل مئات الكتب من الأرشيف والمكتبات الرقمية المفتوحة.</p>
                    
                    <div className="mt-8 flex gap-2">
                       <Tooltip content="أدخل النطاق الأساسي للموقع المراد فحصه" position="top">
                         <input 
                            type="text" 
                            placeholder="رابط الموقع (Domain)..." 
                            value={crawlUrl}
                            onChange={e => setCrawlUrl(e.target.value)}
                            className="flex-1 bg-gray-50 border border-black/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:border-emerald-500 transition-all font-sans"
                          />
                       </Tooltip>
                       <Tooltip content="بدء عملية الزحف الآلي" position="top">
                         <button 
                          onClick={handleCrawl}
                          disabled={!crawlUrl || isCrawling}
                          className="p-3 bg-emerald-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isCrawling ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                        </button>
                       </Tooltip>
                    </div>
                  </div>

                  {/* Card: Folder Watcher (Knowledge Sync) */}
                  <Tooltip content="مراقبة المجلدات المحلية للمزامنة التلقائية" position="bottom">
                    <div className="bg-white border border-black/5 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                      <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:animate-bounce">
                        <FolderSync size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">مزامنة المجلدات</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">أي ملف تضعه في مجلد <code className="bg-amber-100 text-amber-700 px-1 rounded">watched_library</code> سيتم استيراده آلياً في الخلفية.</p>
                      
                      <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Watcher Active</span>
                        </div>
                        <p className="text-[10px] text-amber-600/60 mt-1 font-sans">Monitoring: /watched_library</p>
                      </div>
                    </div>
                  </Tooltip>

                  {/* Card: OCR Extraction */}
                  <Tooltip content="استخراج النصوص من الصور والملفات المصورة" position="bottom">
                    <div 
                      onClick={onShowOCR}
                      className="bg-white border border-black/5 rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all group cursor-pointer border-b-4 border-b-purple-400"
                    >
                      <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Sparkles size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">استخراج نص (OCR)</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">استخراج النصوص من الصور والملفات المصورة باستخدام الذكاء الاصطناعي وحفظها في مكتبتك.</p>
                      
                      <div className="mt-8 flex justify-end">
                        <div className="p-3 bg-purple-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                          <BrainCircuit size={18} />
                        </div>
                      </div>
                    </div>
                  </Tooltip>

                </div>

                {/* 2. Process Queue Panel */}
                {jobs.length > 0 && (
                  <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <Activity size={20} className="text-brand-olive animate-pulse" />
                        <h3 className="text-xl font-bold text-gray-900 font-sans">Queue Operations & ETL Progress</h3>
                      </div>
                      <Tooltip content="مسح جميع العمليات المنتهية من القائمة">
                        <button onClick={() => setJobs([])} className="text-xs text-gray-400 hover:text-red-500 font-bold">تفريغ القائمة</button>
                      </Tooltip>
                    </div>
                    
                    <div className="space-y-4">
                      {jobs.map(job => (
                        <div key={job.id} className="bg-gray-50/50 rounded-2xl p-5 flex items-center gap-6 border border-black/[0.02]">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            job.status === 'done' ? "bg-green-100 text-green-500" : job.status === 'error' ? "bg-red-100 text-red-500" : "bg-brand-olive/10 text-brand-olive animate-pulse"
                          )}>
                            {job.status === 'done' ? <CheckCircle2 size={20} /> : job.type === 'file' ? <FileText size={20} /> : <Globe size={20} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-end mb-2">
                              <p className="text-sm font-bold text-gray-900 truncate max-w-[70%]">{job.name}</p>
                              <span className="text-[10px] font-sans font-black uppercase text-gray-400">
                                {job.status === 'extracting' && 'Extracting Analysis...'}
                                {job.status === 'embedding' && 'Semantic Encoding...'}
                                {job.status === 'indexing' && 'FAISS Vector Indexing...'}
                                {job.status === 'done' && 'Knowledge Ready'}
                                {job.status === 'error' && 'Failed Operation'}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${job.progress}%` }}
                                className={cn("h-full transition-all", job.status === 'error' ? "bg-red-400" : "bg-brand-olive")}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                {books.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                    <BookIcon size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-bold">لا توجد كتب مستوردة حالياً</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map((book) => (
                      <div 
                        key={book.id} 
                        onClick={() => handleSelectBook(book)}
                        className="group bg-white rounded-[24px] p-6 border border-black/5 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gray-50 rounded-bl-[20px] flex items-center justify-center text-gray-300 group-hover:bg-brand-olive/10 group-hover:text-brand-olive transition-colors">
                          {book.source_type === 'url' ? <Link size={14} /> : <FileText size={14} />}
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1 truncate pr-6">{book.title}</h4>
                        {book.format && (
                          <p className="text-[10px] text-gray-500 mb-1 uppercase">{book.format}</p>
                        )}
                        <p className="text-xs text-brand-olive font-bold mb-4 opacity-70 flex items-center gap-1">
                          <Tag size={12} /> {book.category}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
                          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-sans">
                            <Clock size={12} /> {new Date(book.created_at || '').toLocaleDateString('ar-EG')}
                          </div>
                          <Tooltip content="حذف هذا الكتاب نهائياً من المكتبة" position="left">
                            <button onClick={(e) => handleDelete(e, book.id)} title="حذف" className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Footer */}
        <div className="p-6 bg-gray-50 border-t border-black/5 flex items-center justify-between text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>ETL Core Active</span>
            </div>
            <div>Knowledge Base & Semantic Index ready</div>
            <div className="flex items-center gap-4">
              <span>Books: {books.length}</span>
              <span className="w-px h-3 bg-gray-200" />
              <span>Chunks: {books.reduce((acc, b) => acc + (b.content?.length || 0)/1000, 0).toFixed(0)}k</span>
            </div>
        </div>
      </motion.div>
    </div>
  );
};
