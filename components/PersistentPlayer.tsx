'use client';

import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TelegramSDK } from '@/lib/telegram';

export default function PersistentPlayer() {
  const {
    activeTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    languageMode,
    togglePlay,
    seek,
    setPlaybackRate,
    setLanguageMode,
    shadowingOpen,
    toggleShadowing,
    isRecordingShadowing,
    setRecordingShadowing
  } = usePlayerStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [shadowResult, setShadowResult] = useState<{ score: number; words: any[] } | null>(null);

  // Trigger brief vibration when player expands/collapses
  const toggleExpand = () => {
    TelegramSDK.triggerHaptic('light');
    setIsExpanded(!isExpanded);
  };

  // Shadowing Recording trigger
  const handleShadowingRecord = () => {
    if (isRecordingShadowing) return;

    TelegramSDK.triggerHaptic('medium');
    setRecordingShadowing(true);
    setShadowResult(null);

    // Simulate speech recording and server response
    setTimeout(() => {
      setRecordingShadowing(false);
      TelegramSDK.triggerHaptic('success');
      setShadowResult({
        score: 95,
        words: [
          { word: 'Today', status: 'match' },
          { word: 'I', status: 'match' },
          { word: 'woke', status: 'match' },
          { word: 'up', status: 'warn' }, // pronounced slightly inaccurately
          { word: 'early', status: 'match' }
        ]
      });
    }, 4000); // 4 seconds of recording
  };

  if (!activeTrack) return null;

  // Find active sentence token matching currentTime
  const activeToken = activeTrack.tokens?.find(
    (t) => currentTime >= t.start && currentTime <= t.end
  );

  return (
    <>
      {/* ==========================================
          1. MINIMIZED FLOATING PLAYER BAR
          ========================================== */}
      {!isExpanded && (
        <div 
          onClick={toggleExpand}
          className="fixed bottom-20 left-4 right-4 bg-[#161626]/95 border border-white/5 p-3 rounded-2xl flex items-center justify-between z-40 cursor-pointer shadow-lg hover:bg-[#1A1A2E] transition-all"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-xl flex-shrink-0"
              style={{ background: activeTrack.cover_gradient }}
            />
            <div className="min-w-0">
              <h5 className="text-xs font-bold truncate text-white">{activeTrack.title}</h5>
              <p className="text-[9px] text-[#A0A0B0] mt-0.5 truncate uppercase">
                {activeTrack.type === 'hypno' ? '🌙 гипно-сессия' : '🧘 mindtrack'}
              </p>
            </div>
          </div>

          {/* Simple Mini play/pause controller */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              TelegramSDK.triggerHaptic('light');
              togglePlay();
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] flex items-center justify-center text-white text-xs font-bold"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      )}

      {/* ==========================================
          2. EXPANDED FULL-SCREEN PLAYER OVERLAY
          ========================================== */}
      {isExpanded && (
        <div className="fixed inset-0 w-full max-w-md mx-auto bg-[#0D0D14] flex flex-col justify-between z-50 overflow-y-auto animate-slide-up pb-safe">
          
          {/* Top Navigation Row */}
          <div className="p-6 flex justify-between items-center border-b border-white/5">
            <button 
              onClick={toggleExpand}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/80 transition"
            >
              ↓
            </button>
            <div className="text-center">
              <span className="text-[9px] tracking-wider uppercase font-bold text-[#7B61FF] bg-[#7B61FF]/10 px-2.5 py-0.5 rounded-full">
                {activeTrack.type === 'hypno' ? 'Гипно-сессия' : 'MindTrack'}
              </span>
              <h4 className="text-xs font-semibold text-white mt-1 line-clamp-1 max-w-[180px]">{activeTrack.title}</h4>
            </div>
            <button 
              onClick={() => {
                TelegramSDK.triggerHaptic('medium');
                alert('Добавлено в избранное! ♡');
              }}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/80 transition"
            >
              ♡
            </button>
          </div>

          {/* Core Body - Ambient and lyrics rendering */}
          <div className="flex-1 px-6 py-12 flex flex-col justify-center relative overflow-hidden">
            {/* Soft Ambient Background Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
              <div 
                className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl"
                style={{ background: activeTrack.cover_gradient }}
              />
              <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full blur-3xl bg-[#6C3CE1]/30" />
            </div>

            {/* Display list of lyrics/sentences dynamically */}
            {activeTrack.tokens && activeTrack.tokens.length > 0 ? (
              <div className="space-y-6 text-center select-none py-4 relative z-10">
                {activeTrack.tokens.map((token) => {
                  const isFuture = currentTime < token.start;
                  const isActive = currentTime >= token.start && currentTime <= token.end;
                  const isPast = currentTime > token.end;

                  // Evaluate language mode texts
                  let text = token.mixed;
                  if (languageMode === 'russian') text = token.russian;
                  if (languageMode === 'english') text = token.english;

                  return (
                    <p
                      key={token.id}
                      className={`text-lg transition-all duration-300 font-serif leading-relaxed ${
                        isActive 
                          ? 'text-white opacity-100 scale-102 font-medium text-glow-purple' 
                          : isPast 
                          ? 'text-white/40 opacity-50 font-normal scale-98' 
                          : 'text-white/10 opacity-20 font-light'
                      }`}
                      dangerouslySetInnerHTML={{ __html: text }}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-[#A0A0B0] font-light">Слушайте мягкий голос и расслабляйтесь...</p>
            )}

            {/* Bottom Shadowing Modal Slider */}
            {shadowingOpen && (
              <div className="absolute bottom-4 left-4 right-4 bg-[#161626]/95 border border-[#7B61FF]/30 rounded-3xl p-5 space-y-4 z-55 shadow-2xl animate-fade-in backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7B61FF]">Режим Shadowing</h4>
                  <button 
                    onClick={toggleShadowing}
                    className="text-xs text-[#A0A0B0] hover:text-white"
                  >
                    Закрыть
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[10px] text-[#A0A0B0]">Повторите за диктором:</p>
                  <p className="text-xs font-semibold font-serif italic text-white">
                    "{activeToken ? activeToken.english : 'Today I woke up early.'}"
                  </p>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="h-12 flex items-center justify-center bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
                  {isRecordingShadowing ? (
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((h, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-[#E94057] rounded-full animate-pulse" 
                          style={{ 
                            height: `${Math.max(4, h * 3 + Math.random() * 6)}px`,
                            animationDelay: `${i * 0.05}s`
                          }} 
                        />
                      ))}
                    </div>
                  ) : shadowResult ? (
                    <div className="text-center">
                      <span className="text-xs text-[#4ADE80] font-bold">Оценка: {shadowResult.score}% ✨</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#A0A0B0] font-light">Нажмите на микрофон для записи</span>
                  )}
                </div>

                {shadowResult && (
                  <div className="flex justify-center space-x-1 flex-wrap text-[10px]">
                    {shadowResult.words.map((w, idx) => (
                      <span 
                        key={idx} 
                        className={`px-1 rounded ${
                          w.status === 'match' 
                            ? 'text-[#4ADE80] bg-[#4ADE80]/10 font-semibold' 
                            : w.status === 'warn' 
                            ? 'text-yellow-400 bg-yellow-400/10' 
                            : 'text-red-400 bg-red-400/10'
                        }`}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-center">
                  <button 
                    onClick={handleShadowingRecord}
                    disabled={isRecordingShadowing}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                      isRecordingShadowing 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-gradient-to-r from-[#6C3CE1] to-[#E94057]'
                    }`}
                  >
                    🎤
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Player Controller Panel */}
          <div className="p-6 bg-[#12121E]/90 backdrop-blur-md border-t border-white/5 space-y-5">
            
            {/* Audio Timeline Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-[#A0A0B0] font-light font-mono">
                <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
              </div>
              <input 
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  seek(val);
                }}
                className="w-full accent-[#7B61FF] bg-[#1F1F35] h-1 rounded-full cursor-pointer"
              />
            </div>

            {/* Actions: Speed, Audio playback, Shadowing button */}
            <div className="flex justify-between items-center">
              {/* Playback speed toggle */}
              <button 
                onClick={() => {
                  TelegramSDK.triggerHaptic('light');
                  const nextRate = playbackRate === 1.0 ? 1.2 : playbackRate === 1.2 ? 1.5 : 1.0;
                  setPlaybackRate(nextRate);
                }}
                className="text-[10px] text-[#A0A0B0] hover:text-white font-mono bg-white/5 px-2.5 py-1 rounded-lg transition"
              >
                {playbackRate}x
              </button>

              {/* Core controls: skip back, play/pause, skip forward */}
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => {
                    TelegramSDK.triggerHaptic('light');
                    seek(currentTime - 10);
                  }}
                  className="text-xs text-[#A0A0B0] hover:text-white"
                >
                  -10с
                </button>
                <button 
                  onClick={() => {
                    TelegramSDK.triggerHaptic('medium');
                    togglePlay();
                  }}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-[#6C3CE1]/30 hover:brightness-110 active:scale-95 transition"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button 
                  onClick={() => {
                    TelegramSDK.triggerHaptic('light');
                    seek(currentTime + 10);
                  }}
                  className="text-xs text-[#A0A0B0] hover:text-white"
                >
                  +10с
                </button>
              </div>

              {/* Toggle shadowing menu */}
              {activeTrack.type === 'mindtrack' ? (
                <button 
                  onClick={() => {
                    TelegramSDK.triggerHaptic('light');
                    toggleShadowing();
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                    shadowingOpen ? 'bg-[#7B61FF] text-white' : 'bg-white/5 text-white/80'
                  }`}
                >
                  🎤
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>

            {/* Language Mode selectors */}
            <div className="grid grid-cols-3 gap-1 bg-[#1A1A2E]/60 p-1 rounded-xl border border-white/5 text-[10px] font-semibold text-center">
              {[
                { id: 'russian', label: 'Русский' },
                { id: 'mixed', label: 'Смешанный' },
                { id: 'english', label: 'English Only' }
              ].map((m) => (
                <button 
                  key={m.id}
                  onClick={() => {
                    TelegramSDK.triggerHaptic('light');
                    setLanguageMode(m.id as any);
                  }}
                  className={`py-1.5 rounded-lg transition ${
                    languageMode === m.id ? 'bg-[#7B61FF] text-white shadow' : 'text-[#A0A0B0] hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
