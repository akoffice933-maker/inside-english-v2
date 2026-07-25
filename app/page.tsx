'use client';

import React, { useState, useEffect } from 'react';
import { usePlayerStore, Track } from '@/stores/usePlayerStore';
import { registerServiceWorker } from '@/lib/pwa-register';
import { initializePushNotifications } from '@/lib/notifications';
import { TelegramSDK } from '@/lib/telegram';
import InteractiveStudyDemo from '@/components/InteractiveStudyDemo';

export default function HomePage() {
  const { setTrack } = usePlayerStore();
  const [activeState, setActiveState] = useState<'relax' | 'energy' | 'sleep'>('relax');
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('Алексей');

  // Load client features: SW, native Push, Telegram details
  useEffect(() => {
    registerServiceWorker();
    initializePushNotifications();

    if (TelegramSDK.isTMA()) {
      TelegramSDK.ready();
      const tgUser = TelegramSDK.getUser();
      if (tgUser) {
        setUsername(tgUser.first_name);
        TelegramSDK.triggerHaptic('success');
      }
    }
  }, []);

  // Fetch recommended tracks based on active state (Mood selector)
  useEffect(() => {
    async function fetchRecommendedTracks() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/user/recommendations?state=${activeState}&limit=4`);
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data.recommendations || []);
        } else {
          throw new Error('API offline');
        }
      } catch (err) {
        // Safe robust fallback client-side mock list matching seed_data.json
        console.warn('Recommendation API offline. Triggering static mock data...');
        const fallbacks: Track[] = [
          {
            id: '5f3a02a9-d6e6-4db0-bd91-31427a71a39f',
            title: activeState === 'energy' ? 'Утреннее солнце (Morning Sun)' : activeState === 'sleep' ? 'Ночной город (Night City)' : 'Прогулка в лесу (Forest Walk)',
            description: 'Осознанная премиальная аудио-практика для погружения в язык.',
            type: 'mindtrack',
            level: 'A1',
            state: activeState,
            audio_url: 'https://exdtomovofidksatbeje.supabase.co/storage/v1/object/public/audio/morning_sun.mp3',
            duration: 27,
            cover_gradient: activeState === 'sleep' ? 'linear-gradient(135deg, #2B1B4D 0%, #1A1A2E 100%)' : 'linear-gradient(135deg, #6C3CE1 0%, #E94057 100%)',
            is_premium: false,
            tokens: [
              { id: 1, start: 0.0, end: 3.5, russian: "Сегодня я проснулся рано.", english: "Today I woke up early.", mixed: "Сегодня я проснулся <span class='text-[#7B61FF] font-medium'>early</span>." },
              { id: 2, start: 3.5, end: 7.2, russian: "Солнце светит ярко.", english: "The sun is shining brightly.", mixed: "Солнце <span class='text-[#7B61FF] font-medium'>is shining</span> ярко." },
              { id: 3, start: 7.2, end: 11.0, russian: "Я чувствую спокойствие и счастье.", english: "I feel calm and happy.", mixed: "Я чувствую <span class='text-[#7B61FF] font-medium'>calm</span> и <span class='text-[#7B61FF] font-medium'>happy</span>." }
            ]
          },
          {
            id: 'e4b2d56a-12e0-40e1-bb90-0f2c006509a2',
            title: 'Английский во сне (Sleep Deep)',
            description: 'Гипно-сессия для плавного засыпания под шепот базовых фраз.',
            type: 'hypno',
            level: 'A2',
            state: 'sleep',
            audio_url: 'https://exdtomovofidksatbeje.supabase.co/storage/v1/object/public/audio/sleep_deep.mp3',
            duration: 1500,
            cover_gradient: 'linear-gradient(135deg, #2B1B4D 0%, #1A1A2E 100%)',
            is_premium: true,
            tokens: []
          }
        ];
        // Filter by selected mood state fallback
        setRecommendations(fallbacks.filter(t => t.state === activeState || t.type === 'hypno' && activeState === 'sleep'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendedTracks();
  }, [activeState]);

  const handleStateClick = (state: 'relax' | 'energy' | 'sleep') => {
    setActiveState(state);
    TelegramSDK.triggerHaptic('light');
  };

  const handleTrackSelect = (track: Track) => {
    TelegramSDK.triggerHaptic('medium');
    setTrack(track); // Opens the global player overlay and starts playback
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 pb-28">
      
      {/* 1. Welcoming Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[11px] text-[#A0A0B0] font-light tracking-wider uppercase">Утренняя осознанность</p>
          <h2 className="text-xl font-bold tracking-tight">С добрым утром, {username} ☀️</h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6C3CE1] to-[#E94057] p-[1px]">
          <div className="w-full h-full bg-[#0D0D14] rounded-full flex items-center justify-center font-bold text-xs text-white uppercase">
            {username.charAt(0)}
          </div>
        </div>
      </div>

      {/* 2. Primary Hero Recommendation Banner */}
      <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C3CE1]/15 rounded-full blur-2xl" />
        <div className="space-y-1.5">
          <span className="bg-[#FF6B6B]/15 text-[#FF6B6B] text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">Ваша практика сегодня</span>
          <h3 className="text-lg font-bold tracking-tight">MindTrack "Путешествия"</h3>
          <p className="text-xs text-[#A0A0B0] font-light leading-relaxed">Почувствуйте свободу движения и изучите 15 новых фраз.</p>
        </div>
        <button 
          onClick={() => handleTrackSelect({
            id: '5f3a02a9-d6e6-4db0-bd91-31427a71a39f',
            title: 'Утреннее солнце (Morning Sun)',
            description: 'Погружение в язык через состояние расслабления.',
            type: 'mindtrack',
            level: 'A1',
            state: 'energy',
            audio_url: 'https://exdtomovofidksatbeje.supabase.co/storage/v1/object/public/audio/morning_sun.mp3',
            duration: 27,
            cover_gradient: 'linear-gradient(135deg, #6C3CE1 0%, #E94057 100%)',
            is_premium: false,
            tokens: [
              { id: 1, start: 0.0, end: 3.5, russian: "Сегодня я проснулся рано.", english: "Today I woke up early.", mixed: "Сегодня я проснулся <span class='text-[#7B61FF] font-medium'>early</span>." },
              { id: 2, start: 3.5, end: 7.2, russian: "Солнце светит ярко.", english: "The sun is shining brightly.", mixed: "Солнце <span class='text-[#7B61FF] font-medium'>is shining</span> ярко." },
              { id: 3, start: 7.2, end: 11.0, russian: "Я чувствую спокойствие и счастье.", english: "I feel calm and happy.", mixed: "Я чувствую <span class='text-[#7B61FF] font-medium'>calm</span> и <span class='text-[#7B61FF] font-medium'>happy</span>." }
            ]
          })}
          className="w-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-[#6C3CE1]/20 text-white"
        >
          Запустить сеанс
        </button>
      </div>

      {/* 3. State Selector Cards (Relax / Energy / Sleep) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold tracking-wider text-[#A0A0B0] uppercase">Выберите ваше состояние:</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: 'relax', emoji: '🧘', label: 'Расслабиться' },
            { id: 'energy', emoji: '⚡', label: 'Настроиться' },
            { id: 'sleep', emoji: '🌙', label: 'Ко сну' }
          ].map((item) => {
            const isSelected = activeState === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => handleStateClick(item.id as any)}
                className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center border transition-all duration-300 ${
                  isSelected 
                    ? 'bg-[#6C3CE1]/15 border-[#6C3CE1] text-white scale-102 shadow-md shadow-[#6C3CE1]/5' 
                    : 'bg-[#1A1A2E]/30 border-white/5 hover:border-white/10 text-[#A0A0B0]'
                }`}
              >
                <span className="text-xl mb-1">{item.emoji}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Filtered Recommendations Grid */}
      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-bold tracking-wider text-[#A0A0B0] uppercase">Подборка под настроение:</h4>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <span className="w-6 h-6 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recommendations.length === 0 ? (
          <p className="text-xs text-[#A0A0B0] italic text-center py-4">Нет доступных треков для этого настроения.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {recommendations.map((track) => (
              <div 
                key={track.id} 
                onClick={() => handleTrackSelect(track)}
                className="glass-panel p-3 rounded-2xl flex flex-col space-y-3 cursor-pointer hover:scale-[1.01] transition-transform duration-200"
              >
                <div 
                  className="h-24 w-full rounded-xl relative overflow-hidden"
                  style={{ background: track.cover_gradient }}
                >
                  <span className="absolute top-2 left-2 bg-[#7B61FF] text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {track.level}
                  </span>
                  {track.is_premium && (
                    <span className="absolute top-2 right-2 bg-yellow-500/80 text-[7px] text-[#0D0D14] font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                      PRO
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-bold text-xs line-clamp-1">{track.title}</h5>
                  <p className="text-[9px] text-[#A0A0B0] uppercase tracking-wide">
                    {track.type === 'hypno' ? '🌙 гипно-сессия' : '🧘 mindtrack'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          5. INTERACTIVE STUDY DEMO BLOCK (Framer Motion Showcase)
          ========================================== */}
      <InteractiveStudyDemo />

      {/* Persistent Bottom Tab Bar Overlay (CSS Safe) */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-[#0D0D14]/90 backdrop-blur-md border-t border-white/5 py-4 px-6 flex justify-around items-center z-40 rounded-t-3xl">
        <button className="flex flex-col items-center space-y-1 text-[#7B61FF]">
          <span className="text-lg">🏠</span>
          <span className="text-[9px] font-light">Главная</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-[#A0A0B0] hover:text-white transition">
          <span className="text-lg">🧘</span>
          <span className="text-[9px] font-light">Сеансы</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-[#A0A0B0] hover:text-white transition">
          <span className="text-lg">👤</span>
          <span className="text-[9px] font-light">Профиль</span>
        </button>
      </div>

    </div>
  );
}
