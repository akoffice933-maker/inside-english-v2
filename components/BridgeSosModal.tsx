'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { TelegramSDK } from '@/lib/telegram';

interface BridgeSosModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProcessing: boolean;
  sosInput: string;
  setSosInput: (val: string) => void;
  sosOutput: string | null;
  onSubmit: (e: React.FormEvent) => void;
  reduced: boolean;
}

export function BridgeSosModal({
  isOpen,
  onClose,
  isProcessing,
  sosInput,
  setSosInput,
  sosOutput,
  onSubmit,
  reduced
}: BridgeSosModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 w-full max-w-md mx-auto bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
          <motion.div 
            initial={reduced ? { opacity: 1 } : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            className="w-full bg-[#12121E] border-t border-white/10 rounded-t-[32px] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7B61FF]">Помощь в формулировании (SOS)</h4>
              <button 
                onClick={onClose}
                className="text-xs text-[#A0A0B0] hover:text-white bg-white/5 w-6 h-6 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-[#A0A0B0] uppercase block font-light">Что вы хотите сказать на русском?</label>
                <input 
                  type="text"
                  value={sosInput}
                  onChange={(e) => setSosInput(e.target.value)}
                  placeholder="Например: 'Спроси его, свободен ли он в следующий четверг'"
                  className="w-full bg-black/30 border border-white/5 focus:border-[#7B61FF]/50 rounded-xl p-3.5 text-xs text-white/90 placeholder-white/30 focus:outline-none transition"
                  disabled={isProcessing}
                />
              </div>

              <button
                type="submit"
                disabled={!sosInput.trim() || isProcessing}
                className="w-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition text-white flex items-center justify-center"
              >
                {isProcessing ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Сформулировать на английском'
                )}
              </button>
            </form>

            {/* SOS translated result output */}
            <AnimatePresence>
              {sosOutput && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#4ADE80]/5 border border-[#4ADE80]/20 rounded-2xl p-4 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-[#4ADE80] uppercase tracking-wider">Идеальный английский перевод:</span>
                    <button 
                      onClick={() => {
                        TelegramSDK.triggerHaptic('medium');
                        alert(`[Озвучка перевода]: "${sosOutput}"`);
                      }}
                      className="w-6 h-6 rounded-lg bg-[#4ADE80]/10 flex items-center justify-center text-[#4ADE80] hover:bg-[#4ADE80]/20 transition"
                    >
                      <Volume2 size={10} />
                    </button>
                  </div>
                  <p className="text-white/95 font-serif font-semibold text-sm leading-relaxed">"{sosOutput}"</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
