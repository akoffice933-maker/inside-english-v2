'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { 
  staggerContainer, 
  fadeUpVariant, 
  correctFeedbackVariant, 
  incorrectFeedbackVariant, 
  springConfigs 
} from '@/lib/animations';
import { TelegramSDK } from '@/lib/telegram';

interface CardWord {
  word: string;
  translation: string;
  context: string;
  backContext: string;
}

export default function InteractiveStudyDemo() {
  const shouldReduceMotion = useReducedMotion(); // Check system accessibility settings (Section 5.2)
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOption, setSelectedPlan] = useState<number | null>(null);
  const [quizState, setQuizState] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  // Interactive Mock Data for the 3D card
  const cardData: CardWord = {
    word: "Serene",
    translation: "Спокойный, безмятежный",
    context: "Я чувствую calm и happy.",
    backContext: "The morning lake was serene and perfectly still. 🌊"
  };

  // Interactive Quiz options
  const quizOptions = [
    { id: 1, text: "Рано (Early)", isCorrect: true },
    { id: 2, text: "Поздно (Late)", isCorrect: false },
    { id: 3, text: "Ярко (Brightly)", isCorrect: false },
    { id: 4, text: "Медленно (Slowly)", isCorrect: false }
  ];

  const handleCardClick = () => {
    TelegramSDK.triggerHaptic('light');
    setIsFlipped(!isFlipped);
  };

  const handleOptionSelect = (optionId: number, isCorrect: boolean) => {
    if (quizState !== 'idle') return; // block duplicate clicks

    setSelectedPlan(optionId);
    if (isCorrect) {
      TelegramSDK.triggerHaptic('success');
      setQuizState('correct');
      setQuizScore(100); // Progress bar advances
    } else {
      TelegramSDK.triggerHaptic('error');
      setQuizState('incorrect');
    }
  };

  const resetQuiz = () => {
    TelegramSDK.triggerHaptic('light');
    setSelectedPlan(null);
    setQuizState('idle');
    setQuizScore(0);
  };

  // Define physics configs dynamically based on accessibility constraints
  const transitionConfig = shouldReduceMotion 
    ? { type: "tween", duration: 0.15 } 
    : springConfigs.gentle;

  return (
    <div className="space-y-8 py-4 max-w-sm mx-auto w-full relative z-10">
      
      {/* ==========================================
          A. SPRING-BASED PROGRESS BAR (Section 4.4)
          ========================================== */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-[#A0A0B0]">
          <span>Прогресс урока</span>
          <span>{quizState === 'correct' ? '1/1' : '0/1'}</span>
        </div>
        <div className="w-full bg-[#1F1F35] h-1.5 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#6C3CE1] to-[#E94057]"
            initial={{ width: "0%" }}
            animate={{ width: `${quizState === 'correct' ? 100 : 15}%` }}
            transition={transitionConfig} // Spring physical долет
          />
        </div>
      </div>

      {/* ==========================================
          B. 3D FLASHCARD FLIP COMPONENT (Section 4.4)
          ========================================== */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0B0]">3D Флеш-карта (Кликните для переворота):</h4>
        
        {/* Card wrapper specifying perspective for 3D realism */}
        <div 
          className="w-full h-48 cursor-pointer relative select-none"
          style={{ perspective: "1000px" }}
          onClick={handleCardClick}
        >
          <motion.div 
            className="w-full h-full relative"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            {/* FRONT OF THE CARD */}
            <div 
              className="absolute inset-0 w-full h-full glass-panel rounded-3xl p-5 flex flex-col justify-between"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="flex justify-between text-[9px] uppercase tracking-wider text-[#7B61FF] font-extrabold">
                <span>Изучаемое слово</span>
                <span>FRONT</span>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-3xl font-bold font-serif tracking-tight text-white">{cardData.word}</h3>
                <p className="text-xs text-[#A0A0B0] font-light">"{cardData.context}"</p>
              </div>
              <span className="text-[9px] text-[#A0A0B0] text-center font-light uppercase tracking-wider">Нажмите для перевода</span>
            </div>

            {/* BACK OF THE CARD */}
            <div 
              className="absolute inset-0 w-full h-full bg-[#1E123A]/90 border border-[#7B61FF]/40 rounded-3xl p-5 flex flex-col justify-between"
              style={{ 
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)"
              }}
            >
              <div className="flex justify-between text-[9px] uppercase tracking-wider text-[#E94057] font-extrabold">
                <span>Перевод и пример</span>
                <span>BACK</span>
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-[#4ADE80] font-serif">{cardData.translation}</h3>
                <p className="text-[11px] text-[#A0A0B0] italic font-light leading-relaxed">
                  {cardData.backContext}
                </p>
              </div>
              <span className="text-[9px] text-[#A0A0B0] text-center font-light uppercase tracking-wider">Вернуться назад</span>
            </div>

          </motion.div>
        </div>
      </div>

      {/* ==========================================
          C. MULTIPLE-CHOICE QUIZ BLOCK (Stagger & Shakes)
          ========================================== */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0B0]">Тестовый вопрос (Shadowing Quiz):</h4>
          {quizState !== 'idle' && (
            <button 
              onClick={resetQuiz}
              className="text-[10px] text-[#7B61FF] hover:underline uppercase font-bold"
            >
              Сбросить
            </button>
          )}
        </div>

        <div className="glass-panel p-5 rounded-3xl space-y-4">
          <p className="text-xs text-[#A0A0B0] font-light">Выберите верный перевод слова <span className="text-white font-bold font-serif">early</span>:</p>
          
          {/* Staggered Container for cascading options enter */}
          <motion.div 
            className="grid grid-cols-2 gap-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {quizOptions.map((opt) => {
              const isSelected = selectedOption === opt.id;
              
              // Evaluate reactive motion state based on correct/incorrect selection
              let animationState = "visible";
              if (isSelected && quizState === 'correct') animationState = "pulse";
              if (isSelected && quizState === 'incorrect') animationState = "shake";

              return (
                <motion.button
                  key={opt.id}
                  variants={fadeUpVariant}
                  animate={animationState}
                  custom={isSelected}
                  // Map specific motion reaction variants (Section 4.4)
                  whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  onClick={() => handleOptionSelect(opt.id, opt.isCorrect)}
                  disabled={quizState !== 'idle'}
                  className={`py-3 px-3 rounded-2xl border text-left text-xs transition duration-200 ${
                    isSelected && quizState === 'correct'
                      ? 'border-[#4ADE80] bg-[#4ADE80]/15 text-white'
                      : isSelected && quizState === 'incorrect'
                      ? 'border-[#EF4444] bg-[#EF4444]/15 text-white'
                      : 'bg-[#1A1A2E]/50 border-white/5 text-white/80 hover:border-white/15'
                  }`}
                  // Hook up correct/incorrect custom CSS keyframes mapping
                  {...({
                    variants: {
                      ...fadeUpVariant,
                      pulse: correctFeedbackVariant.pulse,
                      shake: incorrectFeedbackVariant.shake
                    }
                  } as any)}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt.text}</span>
                    {isSelected && quizState === 'correct' && <span className="text-[#4ADE80] font-bold text-xs">✓</span>}
                    {isSelected && quizState === 'incorrect' && <span className="text-[#EF4444] font-bold text-xs">✕</span>}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>

    </div>
  );
}
