"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Moon, Zap, Focus, Coffee } from "lucide-react";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { TelegramSDK } from "@/lib/telegram";
import { cn } from "@/lib/utils";

export type AppState = "calm" | "focus" | "energy" | "sleep";

const STATES: {
  id: AppState;
  title: string;
  subtitle: string;
  gradient: string;
  Icon: typeof Moon;
}[] = [
  {
    id: "calm",
    title: "Calm",
    subtitle: "Расслабление и дыхание",
    gradient: "from-[#6C3CE1] to-[#7B61FF]",
    Icon: Moon,
  },
  {
    id: "focus",
    title: "Focus",
    subtitle: "Глубокое погружение",
    gradient: "from-[#5B5BFF] to-[#7B61FF]",
    Icon: Focus,
  },
  {
    id: "energy",
    title: "Energy",
    subtitle: "Заряд и движение",
    gradient: "from-[#E94057] to-[#FF7A5B]",
    Icon: Zap,
  },
  {
    id: "sleep",
    title: "Sleep",
    subtitle: "Сон и восстановление",
    gradient: "from-[#3A1F7A] to-[#6C3CE1]",
    Icon: Coffee,
  },
];

type Props = {
  selected: AppState;
  onSelect: (s: AppState) => void;
};

export default function StateSelector({ selected, onSelect }: Props) {
  const reduced = useReducedMotion();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATES.map((s) => {
        const isActive = s.id === selected;
        return (
          <motion.button
            key={s.id}
            whileTap={reduced ? undefined : { scale: 0.95 }}
            transition={springs.bouncy}
            onClick={() => {
              TelegramSDK.triggerHaptic("light");
              onSelect(s.id);
            }}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 text-left transition-colors",
              isActive
                ? "border-white/30 bg-white/[0.07]"
                : "border-white/5 bg-white/[0.03] hover:bg-white/[0.05]",
            )}
          >
            <div
              className={cn(
                "absolute inset-0 -z-0 bg-gradient-to-br opacity-0 transition-opacity",
                s.gradient,
                isActive && "opacity-25",
              )}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br shadow-glow-purple",
                  s.gradient,
                )}
              >
                <s.Icon size={18} className="text-white" />
              </div>
              {isActive && (
                <motion.span
                  layoutId="state-dot"
                  className="h-2.5 w-2.5 rounded-full bg-white shadow-glow-purple"
                  transition={reduced ? reducedMotionTransition : springs.gentle}
                />
              )}
            </div>
            <div className="relative z-10 mt-3 text-base font-bold text-white">
              {s.title}
            </div>
            <div className="relative z-10 text-xs text-white/50">{s.subtitle}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
