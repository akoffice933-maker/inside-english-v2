"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Crown, Sparkles, Check } from "lucide-react";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { TelegramSDK } from "@/lib/telegram";

type Props = {
  isPro: boolean;
  onUpgrade?: () => void;
};

const FEATURES = [
  "Все PRO-треки и премиум-подкасты",
  "Теневое произношение с ИИ-оценкой",
  "Безлимитный словарь и квизы",
  "Оффлайн-прослушивание в PWA",
];

export default function PremiumBadge({ isPro, onUpgrade }: Props) {
  const reduced = useReducedMotion();
  if (isPro) {
    return (
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={reduced ? reducedMotionTransition : springs.gentle}
        className="flex items-center gap-2 rounded-full border border-[#7B61FF]/40 bg-[#7B61FF]/15 px-3 py-1.5 text-xs"
      >
        <Crown size={14} className="text-[#E94057]" />
        <span className="font-semibold text-white">PRO активен</span>
      </motion.div>
    );
  }
  return (
    <motion.button
      whileHover={reduced ? undefined : { scale: 1.02 }}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={springs.bouncy}
      onClick={() => {
        TelegramSDK.triggerHaptic("medium");
        onUpgrade?.();
      }}
      className="relative flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] px-3 py-1.5 text-xs font-bold text-white shadow-glow-purple"
    >
      <Sparkles size={14} />
      <span>Получить PRO</span>
      <span className="pointer-events-none absolute inset-0 shimmer opacity-30" />
    </motion.button>
  );
}

export function PremiumCard({
  onUpgrade,
  isPro,
}: {
  onUpgrade?: () => void;
  isPro?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduced ? reducedMotionTransition : springs.gentle}
      className="glass-panel relative overflow-hidden p-6 sm:p-8"
      id="pricing"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#6C3CE1] opacity-30 blur-3xl" />
      <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-[#E94057] opacity-25 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
          <Crown size={14} className="text-[#E94057]" />
          <span>Inside English PRO</span>
        </div>
        <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
          Английский в состоянии <span className="text-gradient-primary">потока</span>
        </h3>
        <p className="mt-2 max-w-md text-sm text-white/60">
          Откройте премиум-треки, теневой анализ произношения и безлимитный словарь.
        </p>

        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/80">
              <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="text-2xl font-bold text-white">
            990 ₽ <span className="text-sm font-medium text-white/50">/ месяц</span>
          </div>
          <motion.button
            whileHover={reduced ? undefined : { scale: 1.04 }}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            transition={springs.bouncy}
            onClick={() => {
              TelegramSDK.triggerHaptic("medium");
              onUpgrade?.();
            }}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0D0D14] shadow-glow-purple"
          >
            Попробовать бесплатно
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
