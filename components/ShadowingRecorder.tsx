"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mic, Square, Loader2, Check, X as XIcon } from "lucide-react";
import { needlemanWunsch, type AlignmentResult } from "@/lib/alignment";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { TelegramSDK } from "@/lib/telegram";
import { cn } from "@/lib/utils";

type Recognition = {
  start: (opts?: { interimResults?: boolean; lang?: string }) => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }
}

type Props = {
  reference: string;
  onScore?: (result: AlignmentResult) => void;
};

type Status = "idle" | "listening" | "processing";

export default function ShadowingRecorder({ reference, onScore }: Props) {
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<AlignmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  const supported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported) {
      setError("Голосовой ввод не поддерживается в этом браузере");
      return;
    }
    setError(null);
    setResult(null);
    setTranscript("");
    TelegramSDK.triggerHaptic("medium");

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setTranscript(text);
    };
    r.onerror = () => {
      setError("Не удалось распознать речь");
      setStatus("idle");
    };
    r.onend = () => {
      setStatus("processing");
    };
    recognitionRef.current = r;
    setStatus("listening");
    try {
      r.start();
    } catch {
      setError("Не удалось запустить микрофон");
      setStatus("idle");
    }
  }, [supported]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    r.stop();
    TelegramSDK.triggerHaptic("light");
  }, []);

  // When status switches to processing and we have a transcript, compute score
  if (status === "processing" && transcript && !result && !error) {
    const r = needlemanWunsch(reference, transcript);
    setResult(r);
    onScore?.(r);
    setStatus("idle");
  }

  const scorePct = result ? Math.round(result.score * 100) : 0;
  const scoreColor =
    scorePct >= 80
      ? "text-emerald-400"
      : scorePct >= 50
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <div className="glass-panel relative overflow-hidden p-5 sm:p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#E94057] opacity-20 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/50">Shadowing</div>
          <p className="mt-1 text-sm text-white/70">
            Произнесите фразу вслух — ИИ оценит произношение
          </p>
        </div>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.button
              key="start"
              initial={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
              transition={reduced ? reducedMotionTransition : springs.bouncy}
              whileTap={reduced ? undefined : { scale: 0.92 }}
              onClick={start}
              disabled={!supported}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6C3CE1] to-[#E94057] text-white shadow-glow-purple disabled:opacity-50"
              aria-label="Start recording"
            >
              <Mic size={22} />
            </motion.button>
          )}

          {status === "listening" && (
            <motion.button
              key="stop"
              initial={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
              transition={reduced ? reducedMotionTransition : springs.bouncy}
              whileTap={reduced ? undefined : { scale: 0.92 }}
              onClick={stop}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-rose-500 text-white shadow-glow-pink"
              aria-label="Stop recording"
            >
              <span className="absolute inline-flex h-14 w-14 animate-ping rounded-full bg-rose-500/60" />
              <Square size={18} fill="currentColor" />
            </motion.button>
          )}

          {status === "processing" && (
            <motion.div
              key="loading"
              initial={reduced ? { opacity: 0 } : { opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0 }}
              transition={reduced ? reducedMotionTransition : springs.gentle}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/10 text-white"
            >
              <Loader2 size={20} className="animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p className="relative mt-3 text-xs text-rose-400">{error}</p>
      )}

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Reference</div>
        <p className="mt-1 text-base text-white">{reference}</p>
      </div>

      {transcript && (
        <div className="relative mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">You said</div>
          <p className="mt-1 text-base text-white/80">{transcript}</p>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0 }}
            transition={reduced ? reducedMotionTransition : springs.gentle}
            className="relative mt-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-white/40">Score</span>
              <span className={cn("text-3xl font-bold", scoreColor)}>{scorePct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scorePct}%` }}
                transition={reduced ? reducedMotionTransition : springs.gentle}
                className={cn(
                  "h-full",
                  scorePct >= 80
                    ? "bg-emerald-400"
                    : scorePct >= 50
                      ? "bg-amber-400"
                      : "bg-rose-400",
                )}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {result.tokens.map((tok, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-full border px-2 py-1",
                    tok.status === "match" && "border-emerald-400/40 text-emerald-300",
                    tok.status === "substitution" && "border-amber-400/40 text-amber-300",
                    tok.status === "deletion" && "border-rose-400/40 text-rose-300 line-through",
                    tok.status === "insertion" && "border-sky-400/40 text-sky-300",
                  )}
                >
                  {tok.status === "insertion"
                    ? `+${tok.spoken}`
                    : tok.status === "deletion"
                      ? `−${tok.ref}`
                      : tok.ref}
                </span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] text-white/60">
              <Stat label="Совпадений" value={result.matches} ok />
              <Stat label="Замен" value={result.substitutions} />
              <Stat label="Пропусков" value={result.deletions} />
              <Stat label="Лишних" value={result.insertions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: number; ok?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-white/[0.03] py-2",
        ok && "border-emerald-400/20",
      )}
    >
      <div className="text-base font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/50">{label}</div>
    </div>
  );
}
