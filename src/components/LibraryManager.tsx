import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, FileText, Book as BookIcon, Trash2, Tag, Loader2, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { addBook, getAllBooks, deleteBook, addChunk } from '../services/db';
import { Book } from '../types';
import { geminiService } from '../services/geminiService';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface LibraryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook?: (book: Book) => void;
  onLibraryUpdate?: () => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ isOpen, onClose, onSelectBook, onLibraryUpdate }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [indexingBookId, setIndexingBookId] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState(0);

  const fetchBooks = async () => {
    const allBooks = await getAllBooks();
    setBooks(allBooks.sort((a, b) => b.dateAdded - a.dateAdded));
  };

  useEffect(() => {
    if (isOpen) {
      fetchBooks();
    }
  }, [isOpen]);

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText;
  };

  const extractDocxText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTxtText = async (file: File): Promise<string> => {
    return await file.text();
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    for (const file of acceptedFiles) {
      try {
        setProcessingStatus(`جاري معالجة: ${file.name}...`);
        let content = '';
        let format = '';

        if (file.name.endsWith('.pdf')) {
          content = await extractPdfText(file);
          format = 'pdf';
        } else if (file.name.endsWith('.docx')) {
          content = await extractDocxText(file);
          format = 'docx';
        } else if (file.name.endsWith('.txt')) {
          content = await extractTxtText(file);
          format = 'txt';
        } else {
          console.warn(`Unsupported file format: ${file.name}`);
          continue;
        }

        const newBook: Book = {
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          author: 'غير معروف',
          category: 'عام',
          content,
          format,
          dateAdded: Date.now(),
          created_at: new Date().toISOString(),
          is_indexed: false,
          has_pdf: format === 'pdf',
          has_notes: false,
          source_type: 'db'
        };

        await addBook(newBook);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
    setProcessingStatus('');
    setIsProcessing(false);
    fetchBooks();
    if (onLibraryUpdate) onLibraryUpdate();
  }, [onLibraryUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    }
  } as any);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذا الكتاب؟ سيتم حذف الفهرسة الذكية أيضاً إن وجدت.')) {
      await deleteBook(id);
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

  const generateIndex = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    if (indexingBookId) return; // Prevent multiple indexing at once

    setIndexingBookId(book.id);
    setIndexingProgress(0);

    try {
      // 1. Chunk the text
      const chunkSize = 1500;
      const overlap = 200;
      const text = book.content;
      const chunks = [];
      
      for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push({
          text: text.slice(i, i + chunkSize),
          startIndex: i
        });
      }

      // 2. Generate embeddings for each chunk
      // Process in small batches to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (chunk) => {
          try {
            const embedding = await geminiService.generateEmbedding(chunk.text);
            await addChunk({
              id: crypto.randomUUID(),
              book_id: book.id,
              content: chunk.text,
              embedding,
              startIndex: chunk.startIndex,
              page_number: 0
            });
          } catch (err) {
            console.error("Error embedding chunk:", err);
          }
        }));

        setIndexingProgress(Math.round(((i + batch.length) / chunks.length) * 100));
        
        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 3. Mark book as indexed
      const updatedBook = { ...book, is_indexed: true };
      await addBook(updatedBook);
      await fetchBooks();
      if (onLibraryUpdate) onLibraryUpdate();
      
    } catch (error) {
      console.error("Error indexing book:", error);
      alert("حدث خطأ أثناء الفهرسة الذكية. يرجى المحاولة مرة أخرى.");
    } finally {
      setIndexingBookId(null);
      setIndexingProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-olive/10 rounded-lg text-brand-olive">
                <BookIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-sans">إدارة المكتبة</h2>
                <p className="text-sm text-gray-500">استيراد وتنظيم الكتب والمستندات</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Upload Zone */}
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                ${isDragActive ? 'border-brand-olive bg-brand-olive/5' : 'border-gray-300 hover:border-brand-olive/50 hover:bg-gray-50'}
                ${isProcessing ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-full ${isDragActive ? 'bg-brand-olive/20 text-brand-olive' : 'bg-gray-100 text-gray-500'}`}>
                  {isProcessing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isProcessing ? processingStatus : 'اسحب وأفلت الملفات هنا'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    يدعم صيغ: PDF, DOCX, TXT
                  </p>
                </div>
              </div>
            </div>

            {/* Books List */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-olive" />
                الكتب المستوردة ({books.length})
              </h3>
              
              {books.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                  <BookIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">المكتبة فارغة. قم باستيراد بعض الكتب للبدء.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {books.map((book) => (
                    <div 
                      key={book.id} 
                      onClick={() => handleSelectBook(book)}
                      className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-olive/30 hover:shadow-md transition-all bg-white group cursor-pointer"
                    >
                      <div className="p-3 bg-gray-50 rounded-lg text-gray-400 group-hover:text-brand-olive group-hover:bg-brand-olive/10 transition-colors">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate" title={book.title}>{book.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {book.category}
                          </span>
                          <span className="uppercase bg-gray-100 px-2 py-0.5 rounded font-mono">
                            {book.format}
                          </span>
                          <span>
                            {new Date(book.dateAdded).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        
                        {/* Indexing Progress / Status */}
                        <div className="mt-3 flex items-center gap-2">
                          {book.isIndexed ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              مفهرس ذكياً
                            </span>
                          ) : indexingBookId === book.id ? (
                            <div className="flex items-center gap-2 w-full">
                              <Loader2 className="w-3 h-3 animate-spin text-brand-olive" />
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand-olive transition-all duration-300"
                                  style={{ width: `${indexingProgress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{indexingProgress}%</span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => generateIndex(e, book)}
                              className="flex items-center gap-1 text-xs font-medium text-brand-olive hover:text-white hover:bg-brand-olive border border-brand-olive/30 px-2 py-1 rounded-md transition-colors"
                            >
                              <BrainCircuit className="w-3 h-3" />
                              إنشاء فهرس ذكي
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, book.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="حذف الكتاب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
