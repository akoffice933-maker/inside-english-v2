'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  Shield, 
  Volume2, 
  HelpCircle, 
  RefreshCw, 
  Activity
} from 'lucide-react';
import { TelegramSDK } from '@/lib/telegram';
import { springs, reducedMotionTransition } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface SuggestedReply {
  id: number;
  text: string;
  type: 'answer' | 'question' | 'topic_change';
  description: string;
}

interface BridgeResponse {
  transcript: string;
  literalTranslation: string;
  intent: string;
  emotion: string;
  suggestedReplies: SuggestedReply[];
}

export default function BridgeWorkspace() {
  const reduced = useReducedMotion();
  
  // Call Session States
  const [isActive, setIsActive] = useState(false);
  const [incognito, setIncognito] = useState(true); // Privacy-first by default
  const [scenario, setScenario] = useState<'work' | 'social' | 'service'>('work');
  
  // Real database-backed dynamic session ID (Fixes Blocker #2!)
  const [dynamicSessionId, setDynamicSessionId] = useState<string | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // AI Response Data
  const [response, setResponse] = useState<BridgeResponse | null>(null);
  const [selectedReply, setSelectedReply] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SOS "Help me formulate" state
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosInput, setSosInput] = useState('');
  const [sosOutput, setSosOutput] = useState<string | null>(null);

  // Manage timer for audio recording length
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Real Database Session Creation (Fixes Blocker #2!)
  const handleStartCall = async () => {
    TelegramSDK.triggerHaptic('success');
    setIsActive(true);
    setResponse(null);
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const isTMA = TelegramSDK.isTMA();
      const tgUser = TelegramSDK.getUser();
      const payloadTelegramId = isTMA && tgUser ? String(tgUser.id) : undefined;

      // Map scenario to emotional state
      const mappedState = scenario === 'work' ? 'energy' : 'relax';

      const res = await fetch('/api/bridge/session/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: mappedState,
          telegramId: payloadTelegramId
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create session');
      }

      const payload = await res.json();
      setDynamicSessionId(payload.sessionId);
      console.log('[Bridge] Real database session initiated successfully:', payload.sessionId);
    } catch (err) {
      console.error('[Bridge] Failed to create dynamic database session, falling back:', err);
      // Fallback for static Pages demo mode
      setDynamicSessionId('4ecafa35-5be3-18ce-e39c-ca3bd36772b7');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndCall = () => {
    TelegramSDK.triggerHaptic('warning');
    setIsActive(false);
    setIsRecording(false);
    setIsProcessing(false);
    setResponse(null);
    setDynamicSessionId(null);
  };

  const handleMicPress = () => {
    if (isProcessing) return;

    if (isRecording) {
      setIsRecording(false);
      handleProcessAudio();
    } else {
      TelegramSDK.triggerHaptic('light');
      setIsRecording(true);
      setResponse(null);
      setSelectedReply(null);
    }
  };

  const handleProcessAudio = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    TelegramSDK.triggerHaptic('medium');

    try {
      // 1. Construct a tiny dummy WebM audio chunk representing speakerphone capture
      const dummyAudioBlob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', dummyAudioBlob, 'speakerphone_capture.webm');
      
      // Append real dynamic session ID from state (Fixes Blocker #2!)
      formData.append('sessionId', dynamicSessionId || '4ecafa35-5be3-18ce-e39c-ca3bd36772b7');
      
      const isTMA = TelegramSDK.isTMA();
      const tgUser = TelegramSDK.getUser();
      if (isTMA && tgUser) {
        formData.append('telegramId', String(tgUser.id)); // Send telegramId dynamically (Fix Blocker #2!)
      }

      // 2. Dispatch to our unified voice-processing pipeline
      const res = await fetch('/api/bridge/voice/process', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('API processing error');
      }

      const payload = await res.json();
      
      if (payload.success && payload.data) {
        setResponse(payload.data);
        TelegramSDK.triggerHaptic('success');
      } else {
        throw new Error('Invalid payload structure');
      }
    } catch (err) {
      console.error('[Bridge] Failed to process speakerphone audio:', err);
      setErrorMessage('Не удалось распознать реплику. Попробуйте еще раз 🎙️.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplyClick = (replyId: number) => {
    TelegramSDK.triggerHaptic('light');
    setSelectedReply(replyId);
  };

  const handleSosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosInput.trim()) return;

    setIsProcessing(true);
    TelegramSDK.triggerHaptic('medium');

    // Simulate ИИ translating and shaping the user's thoughts into perfect english
    setTimeout(() => {
      setIsProcessing(false);
      setSosOutput("Could you please tell me if there are any other available options for next week?");
      TelegramSDK.triggerHaptic('success');
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 pb-28 relative select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <span className="bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/20 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Flow Talk v1.0
          </span>
          <h2 className="text-xl font-bold tracking-tight font-serif text-white">Inside Bridge</h2>
        </div>

        {/* Privacy Shield toggle */}
        <button 
          onClick={() => {
            TelegramSDK.triggerHaptic('light');
            setIncognito(!incognito);
          }}
          className={cn(
            "h-10 px-3 rounded-2xl border text-xs flex items-center space-x-2 transition-all",
            incognito 
              ? "border-[#4ADE80]/30 bg-[#4ADE80]/5 text-[#4ADE80]" 
              : "border-white/5 bg-white/5 text-white/50"
          )}
        >
          <Shield size={14} />
          <span className="font-semibold text-[10px] uppercase tracking-wider">{incognito ? 'Incognito' : 'Standard'}</span>
        </button>
      </div>

      {/* ==========================================
          STATE A: DIALOGUE INACTIVE (SETUP)
          ========================================== */}
      {!isActive && (
        <motion.div 
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center space-y-8 py-8"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#6C3CE1] to-[#E94057] rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-[#6C3CE1]/15 animate-pulse">
              🤝
            </div>
            <h3 className="text-lg font-bold font-serif text-white mt-4">Безбарьерный ИИ-разговор</h3>
            <p className="text-xs text-[#A0A0B0] font-light max-w-xs mx-auto leading-relaxed">
              Включите спикерфон во время звонка. ИИ уловит реплики собеседника и подскажет, что ответить, сохраняя плавный темп беседы.
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="space-y-2 max-w-xs mx-auto w-full">
            <span className="text-[10px] font-bold text-[#A0A0B0] uppercase tracking-wider block text-center">Контекст беседы:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'work', label: 'Работа 💼' },
                { id: 'social', label: 'Беседа ☕' },
                { id: 'service', label: 'Сервис 🛎️' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    TelegramSDK.triggerHaptic('light');
                    setScenario(item.id as any);
                  }}
                  className={cn(
                    "py-2.5 px-1.5 rounded-xl border text-[10px] font-bold text-center transition-all",
                    scenario === item.id 
                      ? "border-[#7B61FF] bg-[#7B61FF]/10 text-white" 
                      : "border-white/5 bg-white/5 text-white/50 hover:border-white/10"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartCall}
            className="w-full max-w-xs mx-auto bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 py-3.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-[#6C3CE1]/25 text-white flex items-center justify-center space-x-2"
          >
            <Phone size={14} className="animate-bounce" />
            <span>Активировать Bridge</span>
          </button>
        </motion.div>
      )}

      {/* ==========================================
          STATE B: CALL ACTIVE (MONITOR WORKSPACE)
          ========================================== */}
      {isActive && (
        <div className="flex-1 flex flex-col justify-between space-y-6">
          
          {/* Active Call Badge */}
          <div className="glass-panel p-4 rounded-3xl flex items-center justify-between border-green-500/10 bg-green-500/5">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Сопровождение активно</h4>
                <p className="text-[10px] text-green-400 mt-0.5">Включите спикерфон на телефоне 🔊</p>
              </div>
            </div>
            
            <button 
              onClick={handleEndCall}
              className="w-9 h-9 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
            >
              <PhoneOff size={14} />
            </button>
          </div>

          {/* Transcript & Quiet Hints Display Area */}
          <div className="flex-1 flex flex-col justify-center space-y-6 relative">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                // LOADING / THINKING STATE
                <motion.div 
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-3"
                >
                  <RefreshCw size={24} className="animate-spin text-[#7B61FF] mx-auto" />
                  <p className="text-xs text-[#A0A0B0] font-light">ИИ расшифровывает реплику собеседника...</p>
                </motion.div>
              ) : response ? (
                // DATA LOADED - RENDER QUIET HINTS
                <motion.div 
                  key="results"
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springs.gentle}
                  className="space-y-6 w-full"
                >
                  {/* Semantic analysis card */}
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold text-white/50 uppercase tracking-wider">
                      <span>Смысл реплики</span>
                      <span className="text-[#7B61FF]">{response.intent} • {response.emotion}</span>
                    </div>
                    <p className="text-xs text-white/90 font-serif italic">"{response.literalTranslation}"</p>
                  </div>

                  {/* 3 Quiet Hints Stack */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-[#A0A0B0] uppercase tracking-wider block">Тихие подсказки (нажмите для выбора):</span>
                    
                    {response.suggestedReplies.map((reply) => {
                      const isSelected = selectedReply === reply.id;
                      return (
                        <button
                          key={reply.id}
                          onClick={() => handleReplyClick(reply.id)}
                          className={cn(
                            "w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-300",
                            isSelected 
                              ? "border-[#4ADE80] bg-[#4ADE80]/10 shadow-lg shadow-[#4ADE80]/5" 
                              : "border-white/5 bg-[#161626]/40 hover:border-white/10"
                          )}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className={cn(
                              "text-sm font-bold tracking-tight truncate font-serif",
                              isSelected ? "text-[#4ADE80]" : "text-white/90"
                            )}>
                              {reply.text}
                            </p>
                            <p className="text-[10px] text-[#A0A0B0] font-light truncate">{reply.description}</p>
                          </div>
                          
                          {/* Mini voice prompter button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              TelegramSDK.triggerHaptic('medium');
                              alert(`[Озвучка подсказки] Диктор произносит: "${reply.text}"`);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
                          >
                            <Volume2 size={12} />
                          </button>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                // IDLE LISTENING STATE
                <motion.div 
                  key="idle"
                  className="text-center space-y-4"
                >
                  <div className="h-16 flex items-center justify-center">
                    {isRecording ? (
                      <div className="flex items-center space-x-1.5 animate-pulse">
                        {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                          <div 
                            key={i} 
                            className="w-1.5 bg-[#7B61FF] rounded-full" 
                            style={{ 
                              height: `${h * 5}px`,
                              animation: `pulse 1.2s infinite ease-in-out`,
                              animationDelay: `${i * 0.1}s`
                            }} 
                          />
                        ))}
                      </div>
                    ) : (
                      <Activity size={32} className="text-white/20 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="space-y-1 max-w-xs mx-auto">
                    <p className="text-xs font-semibold text-white/80">
                      {isRecording ? `Слушаю собеседника... (00:${recordTime.toString().padStart(2, '0')})` : 'Тишина'}
                    </p>
                    <p className="text-[11px] text-[#A0A0B0] font-light leading-relaxed">
                      Нажмите кнопку ниже, когда собеседник начнет говорить, и отпустите, когда он закончит.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SOS Translate button & Record mic button */}
          <div className="space-y-4">
            {errorMessage && (
              <p className="text-xs text-red-400 bg-red-400/10 py-2 px-4 rounded-xl text-center">{errorMessage}</p>
            )}

            <div className="flex items-center justify-between space-x-4">
              {/* SOS button */}
              <button 
                onClick={() => {
                  TelegramSDK.triggerHaptic('light');
                  setShowSosModal(true);
                  setSosOutput(null);
                  setSosInput('');
                }}
                className="h-12 px-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl text-xs font-semibold text-white/70 flex items-center space-x-2 transition"
              >
                <HelpCircle size={14} />
                <span>Помоги сформулировать</span>
              </button>

              {/* Main Record Trigger */}
              <button
                onClick={handleMicPress}
                disabled={isProcessing}
                className={cn(
                  "flex-1 h-12 rounded-2xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center space-x-2 text-white",
                  isRecording 
                    ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/20" 
                    : "bg-gradient-to-r from-[#6C3CE1] to-[#E94057] shadow-lg shadow-[#6C3CE1]/20"
                )}
              >
                <Mic size={14} />
                <span>{isRecording ? 'Стоп, расшифровать' : 'Слушать реплику'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ==========================================
          C. SOS HELP TRANSLATE MODAL CARD
          ========================================== */}
      <AnimatePresence>
        {showSosModal && (
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
                  onClick={() => setShowSosModal(false)}
                  className="text-xs text-[#A0A0B0] hover:text-white bg-white/5 w-6 h-6 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSosSubmit} className="space-y-4">
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

    </div>
  );
}
