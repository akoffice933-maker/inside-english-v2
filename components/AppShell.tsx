"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Headphones, BookOpen, User, Sparkles, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/animations";

const TABS = [
  { href: "/", label: "Главная", Icon: Home },
  { href: "/library", label: "Треки", Icon: Headphones },
  { href: "/bridge", label: "Bridge", Icon: Phone }, // Added Inside Bridge as a core tab! (Fix #3b)
  { href: "/study", label: "Слова", Icon: BookOpen },
  { href: "/profile", label: "Профиль", Icon: User },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <Header />
      <main className="relative z-10">{children}</main>
      <BottomNav pathname={pathname} />
    </div>
  );
}

function Header() {
  return (
    <header className="relative z-10 mb-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6C3CE1] to-[#E94057] shadow-glow-purple">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <div className="text-base font-bold leading-tight text-white">Inside English</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">v 2.0</div>
        </div>
      </Link>
      <Link
        href="/landing"
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70"
      >
        Лендинг
      </Link>
    </header>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-30 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2">
      <div className="glass-panel-strong flex items-center justify-around p-1.5">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link key={t.href} href={t.href} className="relative flex-1">
              <motion.div
                whileTap={{ scale: 0.92 }}
                transition={springs.snappy}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-colors",
                  active ? "text-white" : "text-white/50",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-[#6C3CE1] to-[#E94057] shadow-glow-purple"
                    transition={springs.gentle}
                  />
                )}
                <t.Icon size={18} />
                <span>{t.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
