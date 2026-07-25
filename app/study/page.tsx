"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import InteractiveStudyDemo from "@/components/InteractiveStudyDemo";
import { DEMO_WORDS } from "@/lib/seed-data";
import { motion } from "framer-motion";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "calm", label: "Calm" },
  { id: "focus", label: "Focus" },
  { id: "energy", label: "Energy" },
];

export default function StudyPage() {
  const reduced = useReducedMotion();
  const [cat, setCat] = useState("all");
  const words = useMemo(() => {
    if (cat === "all") return DEMO_WORDS;
    return DEMO_WORDS.filter((w) => w.category === cat);
  }, [cat]);

  return (
    <AppShell>
      <SectionHeader title="Словарь" subtitle="3D-карта и квиз" />

      <div className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {CATEGORIES.map((c) => {
          const active = c.id === cat;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-white/30 bg-white text-[#0D0D14]"
                  : "border-white/10 bg-white/5 text-white/70",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={cat}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={reduced ? reducedMotionTransition : springs.gentle}
      >
        <InteractiveStudyDemo words={words} />
      </motion.div>
    </AppShell>
  );
}
