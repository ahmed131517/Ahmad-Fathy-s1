import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { MCQ } from '../types';

interface MCQModalProps {
  mcq: MCQ;
  onClose: () => void;
  onSave: (mcq: MCQ) => void;
}

export const MCQModal: React.FC<MCQModalProps> = ({ mcq, onClose, onSave }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (qIdx: number, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: answer }));
  };

  const checkAnswers = () => {
    setShowResults(true);
    const allCorrect = mcq.questions.every((q, i) => selectedAnswers[i] === q.correct_answer);
    onSave({ ...mcq, answered: true, correct: allCorrect });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-brand-olive">اختبار قصير</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="space-y-6">
          {mcq.questions.map((q, qIdx) => (
            <div key={qIdx} className="space-y-3">
              <p className="font-bold text-gray-800">{qIdx + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => !showResults && handleAnswer(qIdx, opt)}
                    className={`w-full text-right p-3 rounded-xl border transition-colors ${
                      selectedAnswers[qIdx] === opt ? 'bg-brand-olive text-white border-brand-olive' : 'bg-gray-50 border-transparent hover:bg-gray-100'
                    } ${showResults && opt === q.correct_answer ? 'bg-emerald-100 border-emerald-500' : ''}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {showResults && (
                <p className={`text-sm p-2 rounded-lg ${selectedAnswers[qIdx] === q.correct_answer ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        {!showResults && (
          <button
            onClick={checkAnswers}
            className="w-full mt-6 py-3 bg-brand-olive text-white rounded-xl font-bold hover:bg-brand-olive/90"
          >
            تصحيح
          </button>
        )}
      </motion.div>
    </div>
  );
};
