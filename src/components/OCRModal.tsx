import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, Loader2, Copy, Check, Image as ImageIcon, Sparkles } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtract: (text: string) => void;
  onSaveToLibrary: (title: string, content: string) => void;
}

export function OCRModal({ isOpen, onClose, onExtract, onSaveToLibrary }: OCRModalProps) {
  const [fileData, setFileData] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData({
          data: reader.result as string,
          mimeType: file.type || 'image/jpeg',
          name: file.name
        });
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!fileData) return;
    
    setIsProcessing(true);
    try {
      const base64Data = fileData.data.split(',')[1];
      const text = await geminiService.ocr(base64Data, fileData.mimeType);
      setResult(text);
    } catch (error) {
      console.error("OCR Error:", error);
      alert("حدث خطأ أثناء معالجة الملف.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!result || !bookTitle.trim()) return;
    onSaveToLibrary(bookTitle, result);
    setShowSaveDialog(false);
    setBookTitle('');
    onClose();
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-amiri">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-olive/10 rounded-xl flex items-center justify-center text-brand-olive">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">استخراج النصوص الذكي (OCR)</h3>
                  <p className="text-xs text-gray-500">محرك محسّن للمخطوطات التاريخية والخطوط العربية المعقدة</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Upload Section */}
              <div className="w-1/2 p-8 border-l border-black/5 flex flex-col gap-6 bg-gray-50/50">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                    fileData ? 'border-brand-olive/50 bg-brand-olive/5' : 'border-gray-300 hover:border-brand-olive/30 hover:bg-gray-100'
                  }`}
                >
                  {fileData ? (
                    fileData.mimeType.includes('image') ? (
                      <img src={fileData.data} alt="Preview" className="max-h-full max-w-full object-contain p-4 rounded-2xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
                          <FileText size={40} />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-gray-700">{fileData.name}</p>
                          <p className="text-xs text-gray-400">ملف PDF جاهز للمعالجة</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                        <Upload size={32} />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-700">اضغط لرفع صورة أو ملف PDF</p>
                        <p className="text-xs text-gray-400 mt-1">يدعم JPG, PNG, WEBP, PDF</p>
                      </div>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,.pdf" 
                  className="hidden" 
                />
                
                <button
                  onClick={handleProcess}
                  disabled={!fileData || isProcessing}
                  className="w-full py-4 bg-brand-olive text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-olive/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>جاري المعالجة الدقيقة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>بدء الاستخراج المتطور</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-700 font-bold">
                  <Sparkles size={12} />
                  <span>تم تحسين المحرك للتعرف على التشكيل، الشعر، والمخطوطات النادرة</span>
                </div>
              </div>

              {/* Result Section */}
              <div className="w-1/2 p-8 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-700 flex items-center gap-2">
                    <FileText size={16} />
                    النص المستخرج
                  </h4>
                  {result && (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCopy}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex items-center gap-2 text-xs"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                      <button 
                        onClick={() => onExtract(result)}
                        className="p-2 bg-brand-olive/10 text-brand-olive hover:bg-brand-olive/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        <Sparkles size={14} />
                        <span>إرسال للمحرر</span>
                      </button>
                      <button 
                        onClick={() => setShowSaveDialog(true)}
                        className="p-2 bg-brand-olive text-white hover:bg-brand-olive/90 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                      >
                        <Upload size={14} />
                        <span>حفظ في المكتبة</span>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 bg-gray-50 rounded-2xl p-6 border border-black/5 overflow-y-auto custom-scrollbar">
                  {result ? (
                    <div className="whitespace-pre-wrap leading-loose text-gray-800 text-lg">
                      {result}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 opacity-50">
                      <ImageIcon size={48} />
                      <p className="text-sm">سيظهر النص المستخرج هنا بعد المعالجة</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Dialog Overlay */}
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/90 backdrop-blur-md z-20 flex items-center justify-center p-8"
                >
                  <div className="w-full max-w-md space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-brand-olive">حفظ النص في المكتبة</h3>
                      <p className="text-sm text-gray-500">أدخل عنواناً للكتاب أو النص المستخرج ليتم إضافته لمكتبتك الخاصة</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 block">عنوان الكتاب</label>
                      <input 
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="مثال: رسالة في أصول الفقه"
                        className="w-full px-6 py-4 bg-gray-100 rounded-2xl border-none focus:ring-2 focus:ring-brand-olive/20 transition-all text-lg"
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={handleSave}
                        disabled={!bookTitle.trim()}
                        className="flex-1 py-4 bg-brand-olive text-white rounded-2xl font-bold shadow-lg shadow-brand-olive/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        حفظ الآن
                      </button>
                      <button 
                        onClick={() => setShowSaveDialog(false)}
                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
