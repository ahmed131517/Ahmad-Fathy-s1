import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Network, Loader2, Download } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface AutoMindmapModalProps {
  content: string;
  title: string;
  onClose: () => void;
  selectedModel: string;
}

export function AutoMindmapModal({ content, title, onClose, selectedModel }: AutoMindmapModalProps) {
  const [mindmapData, setMindmapData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateMindmap = async () => {
      try {
        // We ask Gemini to generate a simple markdown list that we can render as a tree
        const prompt = `قم بقراءة النص التالي واستخرج منه خريطة ذهنية توضح الأفكار الرئيسية والفرعية.
        قدم الناتج على شكل قائمة نقطية (Bullet points) متداخلة فقط، بدون أي مقدمات أو خاتمات.
        
        النص:
        "${content.substring(0, 3000)}" // Limit to avoid token limits for this demo
        `;
        
        const response = await geminiService.generateText(prompt, selectedModel);
        setMindmapData(response);
      } catch (error) {
        console.error("Failed to generate mindmap:", error);
        setMindmapData("حدث خطأ أثناء توليد الخريطة الذهنية. يرجى المحاولة مرة أخرى.");
      } finally {
        setIsLoading(false);
      }
    };

    generateMindmap();
  }, [content, selectedModel]);

  // A simple function to render markdown list as a visual tree
  const renderTree = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    return (
      <div className="font-amiri text-lg leading-loose text-gray-800 dir-rtl">
        {lines.map((line, index) => {
          const indentLevel = (line.match(/^\s*/)?.[0].length || 0) / 2;
          const cleanLine = line.replace(/^[\s*-\.]+/, '').trim();
          
          if (!cleanLine) return null;

          return (
            <div 
              key={index} 
              className="relative flex items-center py-2"
              style={{ paddingRight: `${indentLevel * 2}rem` }}
            >
              {/* Tree branch line */}
              {indentLevel > 0 && (
                <div 
                  className="absolute right-0 top-1/2 w-8 border-t-2 border-brand-olive/30 border-dashed"
                  style={{ right: `${(indentLevel - 1) * 2 + 1}rem` }}
                />
              )}
              
              <div className="bg-white border-2 border-brand-olive/20 rounded-xl px-4 py-2 shadow-sm relative z-10 hover:border-brand-olive hover:shadow-md transition-all cursor-default">
                {cleanLine}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#fdfbf7] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-black/10"
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-olive/10 flex items-center justify-center text-brand-olive">
              <Network size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-amiri">الخريطة الذهنية</h2>
              <p className="text-sm text-gray-500">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && (
              <button className="p-2 hover:bg-black/5 rounded-full text-gray-500 transition-colors" title="تصدير كصورة">
                <Download size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full text-gray-500 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-brand-olive space-y-4">
              <Loader2 size={48} className="animate-spin" />
              <p className="text-lg font-amiri font-bold animate-pulse">جاري تحليل النص واستخراج الأفكار...</p>
              <p className="text-sm text-gray-500">يقوم الذكاء الاصطناعي ببناء الشجرة المعرفية</p>
            </div>
          ) : (
            <div className="relative z-10 max-w-3xl mx-auto">
              {mindmapData && renderTree(mindmapData)}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
