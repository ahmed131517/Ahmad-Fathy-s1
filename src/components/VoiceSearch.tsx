import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceSearchProps {
  onResult: (text: string) => void;
  className?: string;
}

export const VoiceSearch: React.FC<VoiceSearchProps> = ({ onResult, className }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('المتصفح لا يدعم البحث الصوتي');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError('حدث خطأ في التعرف على الصوت');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [onResult]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        onClick={startListening}
        disabled={isListening}
        className={`p-2 rounded-full transition-all ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-brand-olive/10 text-brand-olive hover:bg-brand-olive/20'
        }`}
        title="بحث صوتي"
      >
        {isListening ? <Mic size={18} /> : <Mic size={18} />}
      </button>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white shadow-xl border border-black/5 rounded-xl p-3 whitespace-nowrap z-50 flex items-center gap-2"
          >
            <div className="flex gap-1">
              <motion.div
                animate={{ height: [4, 12, 4] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="w-1 bg-brand-olive rounded-full"
              />
              <motion.div
                animate={{ height: [8, 16, 8] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                className="w-1 bg-brand-olive rounded-full"
              />
              <motion.div
                animate={{ height: [4, 12, 4] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                className="w-1 bg-brand-olive rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-gray-600">جاري الاستماع...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded border border-red-100 whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
};
