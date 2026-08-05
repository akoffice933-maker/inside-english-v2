"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Mic, Headphones, Brain, Shield, Zap, ArrowRight, Check, Star } from "lucide-react";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { DEMO_WORDS, DEMO_TRACKS } from "@/lib/seed-data";
import InteractiveStudyDemo from "@/components/InteractiveStudyDemo";
import { cn } from "@/lib/utils";
import { TelegramSDK } from "@/lib/telegram";

const FEATURES = [
  {
    Icon: Brain,
    title: "Состояние потока",
    body: "Учите английский, когда вы расслаблены и сосредоточены. Без зубрёжки — через осознанность.",
    gradient: "from-[#6C3CE1] to-[#7B61FF]",
  },
  {
    Icon: Headphones,
    title: "Синхронные тексты",
    body: "Каждое слово подсвечивается в реальном времени. Переключайте RU / EN / микс — мгновенно, без перезагрузки.",
    gradient: "from-[#E94057] to-[#FF7A5B]",
  },
  {
    Icon: Mic,
    title: "Shadowing с ИИ-оценкой",
    body: "Произнесите фразу — алгоритм Нидлмана-Вунша оценит совпадение и укажет ошибки.",
    gradient: "from-[#5B5BFF] to-[#7B61FF]",
  },
  {
    Icon: Shield,
    title: "Оффлайн на iOS",
    body: "PWA с поддержкой HTTP 206 Range. Слушайте уроки в самолёте и без сети.",
    gradient: "from-[#3A1F7A] to-[#6C3CE1]",
  },
];

const STEPS = [
  { num: "01", title: "Выберите состояние", body: "Calm, Focus, Energy или Sleep — мы подберём подходящие треки." },
  { num: "02", title: "Слушайте с подсветкой", body: "Синхронный текст, переключатель языка, плавная анимация." },
  { num: "03", title: "Повторяйте вслух", body: "Shadowing оценит ваше произношение по 4 метрикам." },
  { num: "04", title: "Расширяйте словарь", body: "3D-карта слов и квизы с тактильной обратной связью." },
];

const PRICING = [
  {
    name: "Free",
    price: "0",
    period: "навсегда",
    features: ["Базовые треки", "3D-словарь", "5 квизов в день"],
    cta: "Начать бесплатно",
    highlight: false,
  },
  {
    name: "PRO",
    price: "990",
    period: "₽ / месяц",
    features: [
      "Все PRO-треки",
      "Shadowing без лимитов",
      "Оффлайн-режим в PWA",
      "Push-напоминания",
      "Без рекламы",
    ],
    cta: "Попробовать 7 дней",
    highlight: true,
  },
  {
    name: "Lifetime",
    price: "9 990",
    period: "₽ единоразово",
    features: ["Всё из PRO", "Все будущие курсы", "Приоритетная поддержка"],
    cta: "Купить навсегда",
    highlight: false,
  },
];

const TESTIMONIALS = [
  { name: "Анна К.", text: "Наконец-то я могу учить английский, не чувствуя зубрёжки. Это как медитация.", stars: 5 },
  { name: "Дмитрий С.", text: "Shadowing выявил мои типичные ошибки за 2 недели. Прогресс заметен.", stars: 5 },
  { name: "Мария Л.", text: "В Telegram Mini App выглядит нативно. Слушаю в метро каждый день.", stars: 5 },
];

export default function LandingPage() {
  const reduced = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0D0D14]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6C3CE1] to-[#E94057] shadow-glow-purple">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-base font-bold text-white">Inside English</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/70 sm:flex">
            <a href="#features" className="hover:text-white">Возможности</a>
            <a href="#how" className="hover:text-white">Как это работает</a>
            <a href="#demo" className="hover:text-white">Демо</a>
            <a href="#pricing" className="hover:text-white">Тарифы</a>
          </nav>
          <Link
            href="/"
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#0D0D14]"
          >
            Открыть приложение
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={reduced ? reducedMotionTransition : springs.gentle}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70"
          >
            <Star size={12} className="text-amber-400" fill="currentColor" />
            <span>4.9 ★ — 12 800 учеников</span>
          </motion.div>

          <motion.h1
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={reduced ? reducedMotionTransition : { ...springs.gentle, delay: 0.05 }}
            className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Английский, который
            <br />
            <span className="text-gradient-primary text-glow-purple inline-block motion-preset-pulse motion-duration-2000">чувствуется</span>, а не зубрится
          </motion.h1>

          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={reduced ? reducedMotionTransition : { ...springs.gentle, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-base text-white/60 sm:text-lg"
          >
            Inside English — премиальное приложение для изучения английского через состояние
            расслабления и осознанности. Синхронные тексты, теневой анализ произношения и 3D-словарь.
          </motion.p>

          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={reduced ? reducedMotionTransition : { ...springs.gentle, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/"
              onClick={() => TelegramSDK.triggerHaptic("medium")}
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] px-6 py-3 text-sm font-bold text-white shadow-glow-purple"
            >
              Попробовать бесплатно
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#demo"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white"
            >
              Смотреть демо
            </a>
          </motion.div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> Web PWA</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> iOS / Android (Capacitor)</span>
            <span className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> Telegram Mini App</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Возможности" title="Глубокий дизайн, мгновенный отклик" />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={reduced ? reducedMotionTransition : { ...springs.gentle, delay: i * 0.06 }}
                className="glass-premium-mid hover:glass-premium-high relative overflow-hidden p-5 rounded-3xl transition-all duration-500"
              >
                <div className={cn("mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br shadow-glow-purple", f.gradient)}>
                  <f.Icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-white/60">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Как это работает" title="4 шага к разговорному английскому" />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={reduced ? reducedMotionTransition : { ...springs.gentle, delay: i * 0.05 }}
                className="glass-premium-mid hover:glass-premium-high p-5 rounded-3xl transition-all duration-500"
              >
                <div className="text-gradient-primary text-3xl font-extrabold">{s.num}</div>
                <h4 className="mt-2 text-base font-bold text-white">{s.title}</h4>
                <p className="mt-1 text-sm text-white/60">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO */}
      <section id="demo" className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Интерактив" title="Попробуйте прямо сейчас" />
          <div className="mt-8">
            <InteractiveStudyDemo words={DEMO_WORDS} />
          </div>
        </div>
      </section>

      {/* TRACK PREVIEW */}
      <section className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Библиотека" title="Треки, подобранные под состояние" />
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_TRACKS.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                href="/library"
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.07]"
              >
                <div className={cn("h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br shadow-glow-purple", t.coverGradient)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{t.title}</div>
                  <div className="truncate text-xs text-white/50">{t.artist}</div>
                </div>
                <ArrowRight size={16} className="text-white/40 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Тарифы" title="Простая подписка" />
          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {PRICING.map((p, i) => (
              <motion.div
                key={p.name}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
                whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={reduced ? reducedMotionTransition : { ...springs.gentle, delay: i * 0.06 }}
                className={cn(
                  "relative overflow-hidden rounded-3xl border p-6",
                  p.highlight
                    ? "border-white/30 bg-gradient-to-br from-[#6C3CE1]/30 to-[#E94057]/30 shadow-glow-purple"
                    : "border-white/10 bg-white/[0.04]",
                )}
              >
                {p.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#0D0D14]">
                    ХИТ
                  </div>
                )}
                <div className="text-sm font-medium text-white/60">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{p.price}</span>
                  <span className="text-sm text-white/60">{p.period}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-white/80">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/"
                  className={cn(
                    "mt-6 block rounded-full px-4 py-2.5 text-center text-sm font-bold",
                    p.highlight
                      ? "bg-white text-[#0D0D14]"
                      : "border border-white/20 bg-white/5 text-white",
                  )}
                >
                  {p.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Отзывы" title="Что говорят ученики" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={reduced ? reducedMotionTransition : { ...springs.gentle, delay: i * 0.05 }}
                className="glass-premium-mid hover:glass-premium-high p-5 rounded-3xl transition-all duration-500"
              >
                <div className="mb-2 flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: t.stars }).map((_, idx) => (
                    <Star key={idx} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm text-white/80">«{t.text}»</p>
                <div className="mt-3 text-xs font-semibold text-white/50">— {t.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="glass-premium-mid hover:glass-premium-high relative overflow-hidden p-10 text-center sm:p-14 rounded-[32px] border border-white/10 shadow-glow-purple transition-all duration-500">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#6C3CE1] opacity-30 blur-3xl" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#E94057] opacity-30 blur-3xl" />
            <div className="relative">
              <Zap size={24} className="mx-auto text-[#7B61FF]" />
              <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                Готовы начать?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
                Присоединяйтесь к 12 800 ученикам, которые учат английский через состояние потока.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] px-6 py-3 text-sm font-bold text-white shadow-glow-purple"
              >
                Открыть приложение <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-xs text-white/40 sm:flex-row">
          <div>© {new Date().getFullYear()} Inside English</div>
          <div>Web · iOS · Android · Telegram Mini App</div>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={reduced ? reducedMotionTransition : springs.gentle}
      className="text-center"
    >
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/50">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{title}</h2>
    </motion.div>
  );
}
