"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { springs } from "@/lib/animations";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export default function SectionHeader({ title, subtitle, action, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.gentle}
      className={cn("mb-4 flex items-end justify-between", className)}
    >
      <div>
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}
