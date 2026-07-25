"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import TrackCard from "./TrackCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { springs, reducedMotionTransition } from "@/lib/animations";
import type { Track } from "@/lib/types";

type Props = {
  tracks: Track[];
  isPro?: boolean;
};

export default function RecommendationRail({ tracks, isPro }: Props) {
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dx: number) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: reduced ? "auto" : "smooth" });
  };

  if (tracks.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2"
      >
        {tracks.map((t) => (
          <div key={t.id} className="w-[260px] shrink-0 sm:w-[300px]">
            <TrackCard track={t} isPro={isPro} />
          </div>
        ))}
      </div>
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.9 }}
        transition={springs.snappy}
        onClick={() => scrollBy(-320)}
        className="absolute -left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md sm:grid"
        aria-label="Scroll left"
      >
        <ChevronLeft size={18} />
      </motion.button>
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.9 }}
        transition={springs.snappy}
        onClick={() => scrollBy(320)}
        className="absolute -right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md sm:grid"
        aria-label="Scroll right"
      >
        <ChevronRight size={18} />
      </motion.button>
    </div>
  );
}
