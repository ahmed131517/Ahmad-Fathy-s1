import React from 'react';
import { motion } from 'motion/react';
import { X, User, Book as BookIcon, List, Link as LinkIcon, Clock, Tag, ChevronRight } from 'lucide-react';
import { Book, Chapter, BookRelationship } from '../types';
import { cn } from '../utils';
import { Tooltip } from './Tooltip';

interface BookDetailsProps {
  book: Book;
  relatedBooks?: (Book & { relationshipType: string })[];
  onClose: () => void;
  onSelectChapter?: (chapter: Chapter) => void;
  onSelectRelatedBook?: (book: Book) => void;
}

export const BookDetails: React.FC<BookDetailsProps> = ({ 
  book, 
  relatedBooks = [], 
  onClose, 
  onSelectChapter,
  onSelectRelatedBook 
}) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
        className="relative w-full max-w-4xl h-[80vh] bg-[#fdfbf7] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-black/10 font-amiri"
      >
        {/* Header Section */}
        <div className="relative h-64 bg-brand-olive/10 overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          <Tooltip content="إغلاق تفاصيل الكتاب" position="left">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all z-20"
            >
              <X size={20} />
            </button>
          </Tooltip>
          
          <div className="absolute bottom-8 left-10 right-10 flex items-end gap-8 z-10">
            <div className="w-32 h-44 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-brand-olive shrink-0 border-4 border-white">
              <BookIcon size={48} />
            </div>
            <div className="flex-1 text-white pb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {book.category || 'تصنيف غير محدد'}
                </span>
                {book.century && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">
                    القرن {book.century} هـ
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-black mb-2 leading-tight">{book.title}</h1>
              <div className="flex items-center gap-4 text-white/80">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span className="font-bold">{book.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span className="text-sm">{new Date(book.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-1 h-6 bg-brand-olive rounded-full" />
                نبذة عن الكتاب
              </h3>
              <div className="bg-white rounded-3xl p-10 border border-black/5 card-shadow leading-relaxed text-gray-700 text-lg">
                {book.ai_summary || 'لا يوجد ملخص متاح لهذا الكتاب حالياً. سيقوم النظام بإنشاء ملخص ذكي قريباً.'}
              </div>
            </section>

            <section>
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-1 h-6 bg-brand-olive rounded-full" />
                فهرس المحتويات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {book.chapters && book.chapters.length > 0 ? (
                  book.chapters.map((chapter) => (
                    <Tooltip key={chapter.id} content={`الانتقال إلى ${chapter.title}`} position="top">
                      <button
                        onClick={() => onSelectChapter?.(chapter)}
                        className="flex items-center justify-between p-5 bg-white border border-black/5 rounded-2xl hover:border-brand-olive hover:shadow-md transition-all text-right group w-full card-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-brand-olive/10 group-hover:text-brand-olive transition-colors">
                            <List size={16} />
                          </div>
                          <span className="font-bold text-gray-700">{chapter.title}</span>
                        </div>
                        <span className="text-sm text-gray-400 font-sans">ص {chapter.page_number}</span>
                      </button>
                    </Tooltip>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    لم يتم استخراج الفهرس بعد
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-12">
            <section>
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-1 h-6 bg-brand-olive rounded-full" />
                كتب ذات صلة
              </h3>
              <div className="space-y-6">
                {relatedBooks.length > 0 ? (
                  relatedBooks.map((rel) => (
                    <Tooltip key={rel.id} content={`عرض تفاصيل ${rel.title}`} position="left">
                      <div 
                        onClick={() => onSelectRelatedBook?.(rel)}
                        className="p-6 bg-white border border-black/5 rounded-3xl hover:shadow-lg transition-all cursor-pointer group card-shadow"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className={cn(
                            "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter",
                            rel.relationshipType === 'commentary' ? "bg-blue-50 text-blue-600" :
                            rel.relationshipType === 'abridgment' ? "bg-emerald-50 text-emerald-600" :
                            "bg-amber-50 text-amber-600"
                          )}>
                            {rel.relationshipType === 'commentary' ? 'شرح' : 
                             rel.relationshipType === 'abridgment' ? 'مختصر' : 'حاشية'}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 group-hover:text-brand-olive transition-colors">{rel.title}</h4>
                        <p className="text-sm text-gray-400 mt-1">{rel.author}</p>
                      </div>
                    </Tooltip>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    لا توجد علاقات مسجلة
                  </div>
                )}
              </div>
            </section>

            <section className="bg-brand-olive/5 rounded-3xl p-8 border border-brand-olive/10">
              <h4 className="text-sm font-bold text-brand-olive mb-6 flex items-center gap-2">
                <Tag size={16} /> معلومات تقنية
              </h4>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">المصدر</span>
                  <span className="font-bold text-gray-800 uppercase">{book.source_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الحالة</span>
                  <span className="font-bold text-emerald-700">{book.is_indexed ? 'مفهرس ذكياً' : 'قيد المعالجة'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">تاريخ الإضافة</span>
                  <span className="font-bold text-gray-800">{new Date(book.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </section>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
