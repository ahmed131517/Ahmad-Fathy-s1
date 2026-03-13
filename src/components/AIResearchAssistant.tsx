import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, Loader2, X, BookOpen, Quote, Search } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { searchChunks } from '../services/db';
import { ChatMessage } from '../types';

interface AIResearchAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIResearchAssistant({ isOpen, onClose }: AIResearchAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'مرحباً بك! أنا مساعدك البحثي الذكي. يمكنني مساعدتك في العثور على معلومات من المكتبة وتلخيصها. ماذا تريد أن تبحث عنه اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-pro-preview');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // 1. Generate embedding for semantic search
      const embedding = await geminiService.generateEmbedding(userMessage);
      
      // 2. Search relevant chunks
      const relevantChunks = await searchChunks(embedding, 5);
      
      // 3. Prepare context
      const context = relevantChunks.map(c => `[${c.bookTitle || 'كتاب غير معروف'}]: ${c.content}`).join('\n\n');
      
      // 4. Get AI response
      const aiResponse = await geminiService.chat(userMessage, context, isDeepThinking, selectedModel);
      
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse || 'عذراً، لم أتمكن من معالجة طلبك.' }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'حدث خطأ أثناء الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 h-full w-[450px] bg-white shadow-2xl z-[100] border-r border-black/5 flex flex-col font-amiri"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gradient-to-r from-brand-olive/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-olive rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-olive/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">المساعد البحثي الذكي</h3>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-xs text-brand-olive font-sans bg-transparent border-none focus:ring-0 cursor-pointer"
                >
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                  <option value="ollama">Ollama</option>
                  <option value="lm-studio">LM Studio</option>
                </select>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-brand-bg/20">
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                "لخص هذا الفصل",
                "استخرج الفوائد التربوية",
                "ارسم خريطة مفاهيم",
                "ترجمة الأعلام"
              ].map((label) => (
                <button
                  key={label}
                  onClick={() => setInput(label)}
                  className="px-3 py-1.5 bg-white border border-black/5 rounded-full text-[10px] font-bold text-gray-600 hover:bg-brand-olive hover:text-white transition-all shadow-sm"
                >
                  {label}
                </button>
              ))}
            </div>
            {messages.map((msg, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-brand-olive text-white'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-white border border-black/5 rounded-tr-none' 
                      : 'bg-brand-olive text-white rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-end">
                <div className="flex flex-row-reverse gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-lg bg-brand-olive text-white flex items-center justify-center animate-pulse">
                    <Bot size={16} />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-brand-olive/10 text-brand-olive border border-brand-olive/20 flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-sans">جاري البحث في أمهات الكتب...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 border-t border-black/5 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <button 
                onClick={() => setIsDeepThinking(!isDeepThinking)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans transition-all ${
                  isDeepThinking 
                    ? 'bg-brand-olive text-white shadow-md' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Search size={12} />
                <span>تفكير عميق (Deep Thinking)</span>
              </button>
            </div>
            <div className="relative">
              <textarea
                rows={3}
                placeholder="اسأل عن مسألة فقهية، ترجمة علم، أو اطلب تلخيصاً..."
                className="w-full p-4 pr-4 pl-12 bg-gray-50 border border-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-olive/20 resize-none text-sm transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute left-3 bottom-3 w-10 h-10 bg-brand-olive text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-olive/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-3 text-[10px] text-gray-400 text-center font-sans">
              قد يخطئ الذكاء الاصطناعي، يرجى دائماً مراجعة المصادر المذكورة.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
