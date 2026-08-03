"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, X as XIcon, RotateCw, Sparkles, Brain, Volume2 } from "lucide-react";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { TelegramSDK } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "./SpotlightCard";

export type StudyWord = {
  id: number;
  english: string;
  russian: string;
  transcription?: string;
  example?: string;
  exampleTranslation?: string;
  // 3D position in the conceptual map
  x: number;
  y: number;
  z: number;
};

type QuizQuestion = {
  word: StudyWord;
  options: string[]; // russian options, one correct
  correctIndex: number;
};

type Props = {
  words: StudyWord[];
  onComplete?: (correct: number, total: number) => void;
};

const QUIZ_LENGTH = 6;

function buildQuiz(words: StudyWord[]): QuizQuestion[] {
  const pool = [...words];
  const questions: QuizQuestion[] = [];
  for (let i = 0; i < Math.min(QUIZ_LENGTH, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const word = pool.splice(idx, 1)[0];
    if (!word) break;
    const distractors = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.russian);
    const options = [...distractors, word.russian].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(word.russian);
    questions.push({ word, options, correctIndex });
  }
  return questions;
}

export default function InteractiveStudyDemo({ words, onComplete }: Props) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<"map" | "quiz">("map");
  const [flippedId, setFlippedId] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[]>(() => buildQuiz(words));
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const currentQuestion = quiz[questionIdx];

  const handleFlip = useCallback(
    (id: number) => {
      TelegramSDK.triggerHaptic("light");
      setFlippedId((prev) => (prev === id ? null : id));
    },
    [],
  );

  const handleAnswer = useCallback(
    (idx: number) => {
      if (!currentQuestion || selected !== null) return;
      setSelected(idx);
      const isCorrect = idx === currentQuestion.correctIndex;
      TelegramSDK.triggerHaptic(isCorrect ? "success" : "error");
      setScore((s) => ({
        correct: s.correct + (isCorrect ? 1 : 0),
        total: s.total + 1,
      }));
      window.setTimeout(() => {
        if (questionIdx + 1 >= quiz.length) {
          onComplete?.(score.correct + (isCorrect ? 1 : 0), score.total + 1);
          return;
        }
        setQuestionIdx((i) => i + 1);
        setSelected(null);
      }, 1300);
    },
    [currentQuestion, onComplete, questionIdx, quiz.length, score],
  );

  const restart = useCallback(() => {
    setQuiz(buildQuiz(words));
    setQuestionIdx(0);
    setSelected(null);
    setScore({ correct: 0, total: 0 });
    TelegramSDK.triggerHaptic("medium");
  }, [words]);

  return (
    <SpotlightCard 
      glowColor="rgba(123, 97, 255, 0.2)"
      className="p-6 sm:p-8 border border-[#7B61FF]/30 relative overflow-hidden transition-all duration-500"
    >
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#6C3CE1] opacity-30 blur-3xl" />
      <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-[#E94057] opacity-25 blur-3xl" />

      <div className="relative mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
            <Sparkles size={14} className="text-[#7B61FF]" />
            <span>Interactive demo</span>
          </div>
          <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {mode === "map" ? "3D карта слов" : "Быстрый квиз"}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode("map");
              TelegramSDK.triggerHaptic("light");
            }}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              mode === "map" ? "bg-white text-[#0D0D14]" : "bg-white/5 text-white/70",
            )}
          >
            Карта
          </button>
          <button
            onClick={() => {
              setMode("quiz");
              TelegramSDK.triggerHaptic("light");
            }}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              mode === "quiz" ? "bg-white text-[#0D0D14]" : "bg-white/5 text-white/70",
            )}
          >
            <Brain size={14} className="mr-1 inline" />
            Квиз
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "map" ? (
          <motion.div
            key="map"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={reduced ? reducedMotionTransition : springs.gentle}
          >
            <WordMap3D words={words} flippedId={flippedId} onFlip={handleFlip} reduced={!!reduced} />
            <p className="mt-4 text-center text-sm text-white/50">
              Нажмите на сферу, чтобы перевернуть карточку
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={reduced ? reducedMotionTransition : springs.gentle}
            className="min-h-[300px]"
          >
            {!currentQuestion || questionIdx >= quiz.length ? (
              <QuizSummary score={score} onRestart={restart} />
            ) : (
              <QuizCard
                question={currentQuestion}
                selected={selected}
                onAnswer={handleAnswer}
                index={questionIdx}
                total={quiz.length}
                reduced={!!reduced}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </SpotlightCard>
  );
}

/* ============================================================
   3D WORD MAP
   ============================================================ */
function WordMap3D({
  words,
  flippedId,
  onFlip,
  reduced,
}: {
  words: StudyWord[];
  flippedId: number | null;
  onFlip: (id: number) => void;
  reduced: boolean;
}) {
  const placed = useMemo(
    () =>
      words.map((w, i) => {
        const angle = (i / Math.max(words.length, 1)) * Math.PI * 2;
        const r = 110 + ((i % 3) - 1) * 30;
        return {
          ...w,
          px: 50 + (Math.cos(angle) * r) / 2.6,
          py: 50 + (Math.sin(angle) * r) / 3.2,
        };
      }),
    [words],
  );

  return (
    <div className="relative mx-auto h-[280px] w-full max-w-md">
      {/* Center glow */}
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#6C3CE1] to-[#E94057] opacity-50 blur-2xl" />

      {/* SVG connecting lines */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {placed.map((w, i) => {
          const next = placed[(i + 1) % placed.length];
          if (!next) return null;
          return (
            <line
              key={w.id}
              x1={w.px}
              y1={w.py}
              x2={next.px}
              y2={next.py}
              stroke="rgba(123,97,255,0.25)"
              strokeWidth="0.15"
              strokeDasharray="0.6 0.6"
            />
          );
        })}
      </svg>

      {placed.map((w) => {
        const isFlipped = flippedId === w.id;
        return (
          <motion.button
            key={w.id}
            initial={false}
            animate={
              reduced
                ? { left: `${w.px}%`, top: `${w.py}%` }
                : {
                    left: `${w.px}%`,
                    top: `${w.py}%`,
                    y: [0, -6, 0],
                  }
            }
            transition={
              reduced
                ? undefined
                : { duration: 4 + (w.id % 3), repeat: Infinity, ease: "easeInOut" }
            }
            onClick={() => onFlip(w.id)}
            className="flashcard-wrapper absolute -translate-x-1/2 -translate-y-1/2"
            style={{ width: 96, height: 96 }}
            aria-label={`Flashcard ${w.english}`}
          >
            <div
              className="flashcard-inner"
              style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              <div className="flashcard-face flashcard-front bg-gradient-to-br from-[#6C3CE1] to-[#E94057] shadow-glow-purple">
                <div className="px-2 text-center">
                  <div className="text-xs font-bold text-white">{w.english}</div>
                  {w.transcription && (
                    <div className="mt-0.5 text-[10px] text-white/70">{w.transcription}</div>
                  )}
                </div>
              </div>
              <div className="flashcard-face flashcard-back bg-[#1A1A2E] border border-white/20">
                <div className="px-2 text-center">
                  <div className="text-xs font-semibold text-white">{w.russian}</div>
                  {w.example && (
                    <div className="mt-0.5 line-clamp-2 text-[9px] text-white/50">
                      {w.exampleTranslation ?? w.example}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ============================================================
   QUIZ CARD
   ============================================================ */
function QuizCard({
  question,
  selected,
  onAnswer,
  index,
  total,
  reduced,
}: {
  question: QuizQuestion;
  selected: number | null;
  onAnswer: (idx: number) => void;
  index: number;
  total: number;
  reduced: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-white/60">
        <span>
          Вопрос {index + 1} / {total}
        </span>
        <span className="flex items-center gap-1">
          <Volume2 size={12} />
          произнесите мысленно
        </span>
      </div>

      <motion.div
        key={question.word.id}
        animate={
          reduced
            ? {}
            : selected === null
              ? { scale: 1 }
              : selected === question.correctIndex
                ? { scale: [1, 1.04, 1] }
                : { x: [0, -8, 8, -6, 6, -4, 4, 0] }
        }
        transition={
          reduced
            ? reducedMotionTransition
            : selected !== null && selected !== question.correctIndex
              ? { duration: 0.45 }
              : springs.bouncy
        }
        className={cn(
          "rounded-2xl border-2 bg-white/5 p-6 text-center transition-colors",
          selected === null && "border-white/10",
          selected === question.correctIndex && "border-emerald-400/70 bg-emerald-400/10",
          selected !== null && selected !== question.correctIndex && "border-rose-400/70 bg-rose-400/10",
        )}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Переведите</div>
        <div className="mt-1 text-3xl font-bold text-white text-glow-purple">
          {question.word.english}
        </div>
        {question.word.transcription && (
          <div className="mt-1 text-sm text-white/40">{question.word.transcription}</div>
        )}
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === question.correctIndex;
          const showResult = selected !== null;
          return (
            <motion.button
              key={`${question.word.id}-${i}`}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              transition={springs.snappy}
              onClick={() => onAnswer(i)}
              disabled={selected !== null}
              className={cn(
                "flex items-center justify-between rounded-2xl border bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition-colors",
                !showResult && "border-white/10 hover:border-white/30",
                showResult && isCorrect && "border-emerald-400/70 bg-emerald-400/10",
                showResult && isSelected && !isCorrect && "border-rose-400/70 bg-rose-400/10",
                showResult && !isSelected && !isCorrect && "opacity-50 border-white/5",
              )}
            >
              <span>{opt}</span>
              {showResult && isCorrect && <Check size={16} className="text-emerald-400" />}
              {showResult && isSelected && !isCorrect && (
                <XIcon size={16} className="text-rose-400" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   QUIZ SUMMARY
   ============================================================ */
function QuizSummary({
  score,
  onRestart,
}: {
  score: { correct: number; total: number };
  onRestart: () => void;
}) {
  const reduced = useReducedMotion();
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={reduced ? reducedMotionTransition : springs.gentle}
      className="grid place-items-center py-10 text-center"
    >
      <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-[#6C3CE1] to-[#E94057] shadow-glow-purple">
        <span className="text-2xl font-bold text-white">{pct}%</span>
      </div>
      <h4 className="mt-4 text-xl font-bold text-white">Квиз завершён</h4>
      <p className="mt-1 text-sm text-white/60">
        {score.correct} из {score.total} правильных ответов
      </p>
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.95 }}
        transition={springs.bouncy}
        onClick={onRestart}
        className="mt-6 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0D0D14]"
      >
        <RotateCw size={14} />
        Сыграть ещё
      </motion.button>
    </motion.div>
  );
}
