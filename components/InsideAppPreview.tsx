import React, { useState, useEffect, useRef } from 'react';

// Interfaces based on TZ v2.0
interface Token {
  id: number;
  start: number;
  end: number;
  russian: string;
  english: string;
  mixed: string;
}

interface Track {
  id: string;
  title: string;
  description: string;
  type: 'mindtrack' | 'hypno';
  level: 'A0' | 'A1' | 'A2' | 'B1' | 'B2';
  state: 'relax' | 'energy' | 'sleep';
  audio_url: string;
  duration: number;
  cover_gradient: string;
  is_premium: boolean;
  tokens: Token[];
}

export default function InsideAppPreview() {
  // Navigation & State Filters
  const [activeTab, setActiveTab] = useState<'home' | 'sessions' | 'profile'>('home');
  const [selectedState, setSelectedState] = useState<'relax' | 'energy' | 'sleep'>('relax');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [languageMode, setLanguageMode] = useState<'russian' | 'mixed' | 'english'>('mixed');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  
  // Shadowing & Assessment state
  const [isRecording, setIsRecording] = useState(false);
  const [showShadowing, setShowShadowing] = useState(false);
  const [shadowingResult, setShadowingResult] = useState<{
    score: number;
    words: { word: string; status: 'match' | 'miss' | 'warn' }[];
  } | null>(null);

  // Hypnosis mood assessment state
  const [showMoodSurvey, setShowMoodSurvey] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Interval Ref for simulated audio ticking
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sample Data matching seed_data.json
  const tracks: Track[] = [
    {
      id: "5f3a02a9-d6e6-4db0-bd91-31427a71a39f",
      title: "Утреннее солнце (Morning Sun)",
      description: "Мягкий утренний трек для пробуждения и зарядки уверенностью на английском языке.",
      type: "mindtrack",
      level: "A1",
      state: "energy",
      audio_url: "",
      duration: 27, // 27 seconds for easy preview simulation
      is_premium: false,
      cover_gradient: "linear-gradient(135deg, #6C3CE1 0%, #E94057 100%)",
      tokens: [
        { id: 1, start: 0.0, end: 3.5, russian: "Сегодня я проснулся рано.", english: "Today I woke up early.", mixed: "Сегодня я проснулся <span class='text-[#7B61FF] font-medium'>early</span>." },
        { id: 2, start: 3.5, end: 7.2, russian: "Солнце светит ярко.", english: "The sun is shining brightly.", mixed: "Солнце <span class='text-[#7B61FF] font-medium'>is shining</span> ярко." },
        { id: 3, start: 7.2, end: 11.0, russian: "Я чувствую спокойствие и счастье.", english: "I feel calm and happy.", mixed: "Я чувствую <span class='text-[#7B61FF] font-medium'>calm</span> и <span class='text-[#7B61FF] font-medium'>happy</span>." },
        { id: 4, start: 11.0, end: 15.4, russian: "Я выпил чашку чая и посмотрел в окно.", english: "I drank a cup of tea and looked out the window.", mixed: "Я выпил чашку <span class='text-[#7B61FF] font-medium'>tea</span> и посмотрел в окно." },
        { id: 5, start: 15.4, end: 18.9, russian: "Птицы поют.", english: "The birds are singing.", mixed: "Птицы <span class='text-[#7B61FF] font-medium'>are singing</span>." },
        { id: 6, start: 18.9, end: 22.5, russian: "Это прекрасное утро.", english: "It is a beautiful morning.", mixed: "Это прекрасное <span class='text-[#7B61FF] font-medium'>morning</span>." },
        { id: 7, start: 22.5, end: 27.0, russian: "Я готов учить английский сегодня.", english: "I am ready to learn English today.", mixed: "Я готов <span class='text-[#7B61FF] font-medium'>to learn</span> английский сегодня." }
      ]
    },
    {
      id: "e4b2d56a-12e0-40e1-bb90-0f2c006509a2",
      title: "Английский во сне (Sleep Deep)",
      description: "Гипно-сессия для плавного погружения в сон под шепот базовых фраз на английском.",
      type: "hypno",
      level: "A1",
      state: "sleep",
      audio_url: "",
      duration: 30,
      is_premium: true,
      cover_gradient: "linear-gradient(135deg, #2B1B4D 0%, #1A1A2E 100%)",
      tokens: [
        { id: 1, start: 0.0, end: 5.0, russian: "Закрой свои глаза.", english: "Close your eyes.", mixed: "Закрой свои <span class='text-[#7B61FF]'>eyes</span>." },
        { id: 2, start: 6.0, end: 12.0, russian: "Глубокий вдох... И выдох.", english: "Deep breath in... And breath out.", mixed: "Глубокий <span class='text-[#7B61FF]'>breath in</span>... И <span class='text-[#7B61FF]'>breath out</span>." },
        { id: 3, start: 13.5, end: 19.0, russian: "Ты в безопасности. Твой ум чист.", english: "You are safe. Your mind is clear.", mixed: "Ты <span class='text-[#7B61FF]'>safe</span>. Твой <span class='text-[#7B61FF]'>mind</span> чист." },
        { id: 4, start: 21.0, end: 28.0, russian: "Засыпай и слушай мой голос.", english: "Fall asleep and listen to my voice.", mixed: "Засыпай и <span class='text-[#7B61FF]'>listen</span> to my voice." }
      ]
    },
    {
      id: "a3a2d56b-42e1-40ff-99dd-0f2c006509a3",
      title: "Прогулка в лесу (Forest Walk)",
      description: "Осознанная практика прогулки с изучением природных ассоциаций.",
      type: "mindtrack",
      level: "A2",
      state: "relax",
      audio_url: "",
      duration: 120,
      is_premium: false,
      cover_gradient: "linear-gradient(135deg, #0A5C36 0%, #022E1B 100%)",
      tokens: []
    }
  ];

  // Play / Pause timer simulation
  useEffect(() => {
    if (isPlaying && selectedTrack) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const nextTime = prev + 0.1 * playbackRate;
          if (nextTime >= selectedTrack.duration) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (selectedTrack.type === 'hypno') {
              setShowMoodSurvey(true);
            }
            return selectedTrack.duration;
          }
          return parseFloat(nextTime.toFixed(1));
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, selectedTrack, playbackRate]);

  // Audio seeking simulation helper
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  // Shadowing simulation triggers
  const startRecordingShadowing = () => {
    setIsRecording(true);
    setShadowingResult(null);
    setTimeout(() => {
      setIsRecording(false);
      setShadowingResult({
        score: 94,
        words: [
          { word: "Today", status: "match" },
          { word: "I", status: "match" },
          { word: "woke", status: "match" },
          { word: "up", status: "warn" },
          { word: "early", status: "match" }
        ]
      });
    }, 4000); // Record for 4 seconds
  };

  // Determine current active sentence based on tokens and timing
  const getActiveTokenIndex = () => {
    if (!selectedTrack || !selectedTrack.tokens.length) return -1;
    return selectedTrack.tokens.findIndex(
      (token) => currentTime >= token.start && currentTime <= token.end
    );
  };

  const activeTokenIndex = getActiveTokenIndex();

  return (
    <div className="min-h-screen bg-[#0D0D14] text-white font-sans selection:bg-[#6C3CE1]/30 selection:text-white flex justify-center items-start py-8 px-4">
      <div className="w-full max-w-md bg-[#12121E] rounded-[40px] shadow-2xl border border-white/5 overflow-hidden flex flex-col min-h-[820px] relative">
        
        {/* --- MAIN HEADER / HERO AREA --- */}
        {activeTab === 'home' && !selectedTrack && (
          <div className="p-6 pb-2 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6C3CE1] to-[#E94057] p-[1.5px]">
                  <div className="w-full h-full bg-[#12121E] rounded-full flex items-center justify-center font-bold text-xs text-white">
                    A
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#A0A0B0] font-light">С добрым утром,</div>
                  <div className="text-sm font-semibold tracking-wide">Алексей ☀️</div>
                </div>
              </div>
              <button className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>
            </div>

            {/* Premium Hero Banner */}
            <div className="bg-gradient-to-br from-[#2B1B4D] to-[#1A1A2E] p-5 rounded-3xl border border-white/5 space-y-4 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#6C3CE1]/20 rounded-full blur-2xl" />
              <div className="space-y-1">
                <span className="bg-white/10 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold text-[#FF6B6B]">Рекомендация</span>
                <h3 className="text-lg font-bold tracking-tight mt-1">MindTrack "Путешествия"</h3>
                <p className="text-xs text-[#A0A0B0] font-light">Почувствуйте свободу движения и изучите 15 новых фраз.</p>
              </div>
              <button 
                onClick={() => setSelectedTrack(tracks[0])}
                className="w-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 active:scale-[0.98] py-3 rounded-2xl text-xs font-semibold tracking-wider uppercase transition shadow-lg shadow-[#6C3CE1]/20"
              >
                Продолжить практику
              </button>
            </div>

            {/* State Selector */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold tracking-wider text-[#A0A0B0] uppercase">Ваше состояние сейчас:</h4>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setSelectedState('relax')}
                  className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center border transition ${selectedState === 'relax' ? 'bg-[#6C3CE1]/20 border-[#6C3CE1]' : 'bg-[#1A1A2E]/50 border-white/5 hover:border-white/10'}`}
                >
                  <span className="text-lg mb-1">🧘</span>
                  <span className="text-[11px] font-medium">Расслабиться</span>
                </button>
                <button 
                  onClick={() => setSelectedState('energy')}
                  className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center border transition ${selectedState === 'energy' ? 'bg-[#E94057]/20 border-[#E94057]' : 'bg-[#1A1A2E]/50 border-white/5 hover:border-white/10'}`}
                >
                  <span className="text-lg mb-1">⚡</span>
                  <span className="text-[11px] font-medium">Настроиться</span>
                </button>
                <button 
                  onClick={() => setSelectedState('sleep')}
                  className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center border transition ${selectedState === 'sleep' ? 'bg-[#2B1B4D]/50 border-[#7B61FF]/40' : 'bg-[#1A1A2E]/50 border-white/5 hover:border-white/10'}`}
                >
                  <span className="text-lg mb-1">🌙</span>
                  <span className="text-[11px] font-medium">Ко сну</span>
                </button>
              </div>
            </div>

            {/* MindTracks Section */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold tracking-wider text-[#A0A0B0] uppercase">MindTracks English</h4>
                <button className="text-[11px] text-[#7B61FF] hover:underline">Все</button>
              </div>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {tracks.filter(t => t.type === 'mindtrack').map((track) => (
                  <div 
                    key={track.id} 
                    onClick={() => setSelectedTrack(track)}
                    className="flex-shrink-0 w-[180px] bg-[#1A1A2E]/40 border border-white/5 rounded-3xl p-3 space-y-3 cursor-pointer hover:border-white/15 transition snap-start"
                  >
                    <div 
                      className="h-28 rounded-2xl relative overflow-hidden"
                      style={{ background: track.cover_gradient }}
                    >
                      <span className="absolute top-2 left-2 bg-[#7B61FF] text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase">
                        {track.level}
                      </span>
                      {track.is_premium && (
                        <span className="absolute top-2 right-2 bg-yellow-500/80 text-[8px] text-[#0D0D14] font-bold px-1.5 py-0.5 rounded-md uppercase">
                          PRO
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs line-clamp-1">{track.title}</h5>
                      <p className="text-[10px] text-[#A0A0B0] mt-0.5">⏱️ {track.duration} сек</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HypnoTracks Section */}
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold tracking-wider text-[#A0A0B0] uppercase">ГипноТреки English</h4>
              </div>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {tracks.filter(t => t.type === 'hypno').map((track) => (
                  <div 
                    key={track.id} 
                    onClick={() => setSelectedTrack(track)}
                    className="flex-shrink-0 w-[180px] bg-[#1A1A2E]/40 border border-white/5 rounded-3xl p-3 space-y-3 cursor-pointer hover:border-white/15 transition snap-start"
                  >
                    <div 
                      className="h-28 rounded-2xl relative overflow-hidden flex items-center justify-center"
                      style={{ background: track.cover_gradient }}
                    >
                      <span className="absolute top-2 left-2 bg-[#FF6B6B] text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase">
                        {track.level}
                      </span>
                      <span className="text-2xl opacity-60">🌙</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs line-clamp-1">{track.title}</h5>
                      <p className="text-[10px] text-[#A0A0B0] mt-0.5">⏱️ 25 мин • Медленный темп</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- ALL SESSIONS LIST --- */}
        {activeTab === 'sessions' && !selectedTrack && (
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-light tracking-wide font-serif">Все сеансы</h2>
            
            {/* Filter Tabs */}
            <div className="flex space-x-1.5 bg-[#1A1A2E] p-1 rounded-2xl border border-white/5">
              {['Все', 'MindTracks', 'ГипноТреки'].map((tab, idx) => (
                <button
                  key={idx}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl transition ${idx === 0 ? 'bg-[#7B61FF] text-white shadow-md' : 'text-[#A0A0B0] hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-3 pt-2">
              {tracks.map((track) => (
                <div 
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className="flex items-center space-x-4 bg-[#1A1A2E]/30 hover:bg-[#1A1A2E]/60 border border-white/5 hover:border-white/10 rounded-2xl p-3 cursor-pointer transition"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex-shrink-0"
                    style={{ background: track.cover_gradient }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-bold text-[#7B61FF] uppercase tracking-wide">{track.level}</span>
                      <span className="w-1 h-1 bg-white/20 rounded-full" />
                      <span className="text-[9px] text-[#A0A0B0] uppercase">{track.type}</span>
                    </div>
                    <h4 className="font-bold text-xs mt-0.5 text-white truncate">{track.title}</h4>
                    <p className="text-[10px] text-[#A0A0B0] line-clamp-1 mt-0.5">{track.description}</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition">
                    ▶
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- PROFILE / WHEEL OF BALANCE --- */}
        {activeTab === 'profile' && !selectedTrack && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-[#6C3CE1] to-[#E94057] p-[2px]">
                <div className="w-full h-full bg-[#12121E] rounded-full flex items-center justify-center font-bold text-xl text-white">
                  А
                </div>
              </div>
              <h3 className="text-xl font-medium">Алексей Смирнов</h3>
              <p className="text-xs text-[#A0A0B0]">Текущий уровень: <span className="text-[#7B61FF] font-semibold">A1 (Начинающий)</span></p>
            </div>

            {/* Streak Counter & Minutes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1A1A2E]/40 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-2xl">🔥</span>
                <h4 className="text-lg font-extrabold text-[#FF6B6B] mt-1">12 дней</h4>
                <p className="text-[10px] text-[#A0A0B0] uppercase tracking-wider font-light mt-0.5">Ежедневная серия</p>
              </div>
              <div className="bg-[#1A1A2E]/40 border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-2xl">🎧</span>
                <h4 className="text-lg font-extrabold text-[#4ADE80] mt-1">180 мин</h4>
                <p className="text-[10px] text-[#A0A0B0] uppercase tracking-wider font-light mt-0.5">Время практики</p>
              </div>
            </div>

            {/* Balance Wheel Visualization */}
            <div className="bg-[#1A1A2E]/40 border border-white/5 rounded-3xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-[#A0A0B0] uppercase tracking-wider text-center">Колесо языкового баланса</h4>
              
              <div className="relative flex justify-center py-4">
                {/* Simulated CSS-SVG Wheel of Balance */}
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#1F1F35" strokeWidth="8" fill="transparent" />
                  {/* Listening - 85% */}
                  <circle cx="50" cy="50" r="40" stroke="#6C3CE1" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.85)} />
                  {/* Reading - 60% */}
                  <circle cx="50" cy="50" r="32" stroke="#E94057" strokeWidth="8" fill="transparent" strokeDasharray="201" strokeDashoffset={201 * (1 - 0.60)} />
                  {/* Vocabulary - 45% */}
                  <circle cx="50" cy="50" r="24" stroke="#4ADE80" strokeWidth="8" fill="transparent" strokeDasharray="150.7" strokeDashoffset={150.7 * (1 - 0.45)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">72%</span>
                  <span className="text-[9px] text-[#A0A0B0]">Общий фокус</span>
                </div>
              </div>

              {/* Legend with controls */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6C3CE1]" />
                    <span className="text-[#A0A0B0]">Аудирование</span>
                  </span>
                  <span className="font-semibold">85%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E94057]" />
                    <span className="text-[#A0A0B0]">Чтение текста</span>
                  </span>
                  <span className="font-semibold">60%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
                    <span className="text-[#A0A0B0]">Словарный запас</span>
                  </span>
                  <span className="font-semibold">45%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- DYNAMIC PLAYER SCREEN --- */}
        {selectedTrack && (
          <div className="absolute inset-0 bg-[#0D0D14] flex flex-col justify-between z-50">
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-white/5">
              <button 
                onClick={() => {
                  setSelectedTrack(null);
                  setIsPlaying(false);
                  setCurrentTime(0);
                  setShowMoodSurvey(false);
                  setShowShadowing(false);
                  setShadowingResult(null);
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/80 transition"
              >
                ←
              </button>
              <div className="text-center">
                <span className="text-[9px] tracking-wider uppercase font-bold text-[#7B61FF] bg-[#7B61FF]/10 px-2.5 py-0.5 rounded-full">
                  {selectedTrack.type === 'hypno' ? 'Гипно-сессия' : 'MindTrack'}
                </span>
                <h4 className="text-xs font-semibold text-white mt-1 line-clamp-1 max-w-[180px]">{selectedTrack.title}</h4>
              </div>
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/80 transition">
                ♡
              </button>
            </div>

            {/* Simulated Animated Background */}
            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-center relative">
              {/* Subtle visual ambient backdrops based on state */}
              {selectedTrack.type === 'hypno' ? (
                // Sleep Mode starfield ambient helper
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
                  <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-white rounded-full animate-ping duration-1000" />
                  <div className="absolute top-1/2 left-2/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse duration-2000" />
                  <div className="absolute top-2/3 left-1/4 w-1 h-1 bg-white rounded-full opacity-60" />
                  <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                </div>
              ) : (
                // Regular Energy/Relax Mode smooth ambient glow
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
                  <div 
                    className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl"
                    style={{ background: selectedTrack.cover_gradient }}
                  />
                  <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full blur-3xl bg-[#6C3CE1]/30" />
                </div>
              )}

              {/* Text display / Synced lyrics context */}
              {selectedTrack.tokens && selectedTrack.tokens.length > 0 ? (
                <div className="space-y-6 text-center select-none py-4 relative z-10">
                  {selectedTrack.tokens.map((token, index) => {
                    const isFuture = currentTime < token.start;
                    const isActive = currentTime >= token.start && currentTime <= token.end;
                    const isPast = currentTime > token.end;

                    // Choose content representation
                    let textContent = token.mixed;
                    if (languageMode === 'russian') textContent = token.russian;
                    if (languageMode === 'english') textContent = token.english;

                    return (
                      <p
                        key={token.id}
                        className={`text-lg transition-all duration-300 font-serif leading-relaxed ${
                          isActive 
                            ? 'text-white opacity-100 scale-102 font-medium drop-shadow-md' 
                            : isPast 
                            ? 'text-white/40 opacity-50 font-normal scale-98' 
                            : 'text-white/20 opacity-20 font-light'
                        }`}
                        dangerouslySetInnerHTML={{ __html: textContent }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-[#A0A0B0] font-light">
                  <p>Загрузка текста...</p>
                </div>
              )}

              {/* Hypno Mode Mood Survey overlay modal */}
              {showMoodSurvey && (
                <div className="absolute inset-0 bg-[#0D0D14]/95 flex flex-col justify-center items-center p-6 z-55">
                  <div className="text-center space-y-6 max-w-xs">
                    <span className="text-4xl">😴</span>
                    <h3 className="text-xl font-bold">Как вы себя чувствуете?</h3>
                    <p className="text-xs text-[#A0A0B0]">Ваш ответ поможет персонализировать рекомендации английского на завтра.</p>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                      {[
                        { label: "Сонливость", icon: "💤" },
                        { label: "Полное расслабление", icon: "🧘" },
                        { label: "Ясность ума", icon: "✨" },
                        { label: "Бодрость", icon: "⚡" }
                      ].map((mood, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedMood(mood.label);
                            setShowMoodSurvey(false);
                            setSelectedTrack(null);
                          }}
                          className="py-3 px-2 bg-[#1A1A2E] border border-white/5 hover:border-[#7B61FF] rounded-2xl flex flex-col items-center justify-center transition"
                        >
                          <span className="text-xl mb-1">{mood.icon}</span>
                          <span className="text-[11px] font-medium">{mood.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Shadowing interactive drawer */}
              {showShadowing && (
                <div className="absolute bottom-0 left-0 right-0 bg-[#161626] border-t border-white/10 rounded-t-[32px] p-6 space-y-5 z-55 shadow-2xl">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7B61FF]">Режим Shadowing</h4>
                    <button 
                      onClick={() => setShowShadowing(false)}
                      className="text-xs text-[#A0A0B0] hover:text-white"
                    >
                      Закрыть
                    </button>
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-xs text-[#A0A0B0]">Повторите фразу за диктором:</p>
                    <p className="text-sm font-medium font-serif italic">
                      "{selectedTrack.tokens[activeTokenIndex >= 0 ? activeTokenIndex : 0]?.english || 'Today I woke up early.'}"
                    </p>
                  </div>

                  {/* Waveform visual representation */}
                  <div className="h-16 flex items-center justify-center bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                    {isRecording ? (
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((h, i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-[#E94057] rounded-full animate-pulse" 
                            style={{ 
                              height: `${Math.max(4, h * 4 + Math.random() * 8)}px`,
                              animationDelay: `${i * 0.05}s`
                            }} 
                          />
                        ))}
                      </div>
                    ) : shadowingResult ? (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-[#4ADE80] font-bold">Идеальное совпадение: {shadowingResult.score}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#A0A0B0] font-light">Нажмите на микрофон для записи</span>
                    )}
                  </div>

                  {shadowingResult && (
                    <div className="text-center text-xs space-y-2">
                      <p className="text-[#A0A0B0]">Анализ произношения:</p>
                      <div className="flex justify-center space-x-1 flex-wrap">
                        {shadowingResult.words.map((w, idx) => (
                          <span 
                            key={idx} 
                            className={`px-1.5 py-0.5 rounded ${
                              w.status === 'match' 
                                ? 'text-[#4ADE80] bg-[#4ADE80]/10 font-bold' 
                                : w.status === 'warn' 
                                ? 'text-yellow-400 bg-yellow-400/10' 
                                : 'text-red-400 bg-red-400/10'
                            }`}
                          >
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button 
                      onClick={startRecordingShadowing}
                      disabled={isRecording}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                        isRecording 
                          ? 'bg-red-500 animate-ping' 
                          : 'bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 shadow-[#6C3CE1]/30'
                      }`}
                    >
                      🎤
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Player Controls & Language Selectors */}
            <div className="p-6 bg-[#12121E]/80 backdrop-blur-md border-t border-white/5 space-y-5">
              {/* Timeline Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#A0A0B0] font-light font-mono">
                  <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                  <span>{new Date(selectedTrack.duration * 1000).toISOString().substr(14, 5)}</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max={selectedTrack.duration}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-[#7B61FF] bg-[#1F1F35] h-1 rounded-full cursor-pointer transition"
                />
              </div>

              {/* Key Action Buttons: Audio Controls + Language Switcher */}
              <div className="flex justify-between items-center">
                {/* Playback speed toggle */}
                <button 
                  onClick={() => setPlaybackRate(prev => prev === 1.0 ? 1.2 : prev === 1.2 ? 1.5 : 1.0)}
                  className="text-xs text-[#A0A0B0] hover:text-white font-mono bg-white/5 px-2.5 py-1 rounded-lg transition"
                >
                  {playbackRate}x
                </button>

                {/* Core Play / Pause & Skip Buttons */}
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => setCurrentTime(prev => Math.max(0, prev - 10))}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition text-white/80 text-sm"
                  >
                    -10с
                  </button>
                  
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-[#6C3CE1]/30 hover:brightness-110 active:scale-95 transition"
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>

                  <button 
                    onClick={() => setCurrentTime(prev => Math.min(selectedTrack.duration, prev + 10))}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition text-white/80 text-sm"
                  >
                    +10с
                  </button>
                </div>

                {/* Micro / Shadowing triggers */}
                {selectedTrack.type === 'mindtrack' ? (
                  <button 
                    onClick={() => setShowShadowing(!showShadowing)}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#7B61FF]/20 flex items-center justify-center text-white/80 text-sm transition"
                    title="Включить shadowing"
                  >
                    🎤
                  </button>
                ) : (
                  <div className="w-9" />
                )}
              </div>

              {/* Language Switcher Mode Row */}
              <div className="grid grid-cols-3 gap-1 bg-[#1A1A2E]/60 p-1 rounded-xl border border-white/5 text-[11px] font-medium text-center">
                <button 
                  onClick={() => setLanguageMode('russian')}
                  className={`py-1.5 rounded-lg transition ${languageMode === 'russian' ? 'bg-[#7B61FF] text-white shadow' : 'text-[#A0A0B0] hover:text-white'}`}
                >
                  Русский
                </button>
                <button 
                  onClick={() => setLanguageMode('mixed')}
                  className={`py-1.5 rounded-lg transition ${languageMode === 'mixed' ? 'bg-[#7B61FF] text-white shadow' : 'text-[#A0A0B0] hover:text-white'}`}
                >
                  Смешанный
                </button>
                <button 
                  onClick={() => setLanguageMode('english')}
                  className={`py-1.5 rounded-lg transition ${languageMode === 'english' ? 'bg-[#7B61FF] text-white shadow' : 'text-[#A0A0B0] hover:text-white'}`}
                >
                  English Only
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PERSISTENT BOTTOM TAB NAVIGATION (Visible when no track is playing) --- */}
        {!selectedTrack && (
          <div className="mt-auto bg-[#12121E] border-t border-white/5 py-4 px-6 flex justify-around items-center rounded-b-[40px]">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center space-y-1.5 transition ${activeTab === 'home' ? 'text-[#7B61FF]' : 'text-[#A0A0B0] hover:text-white'}`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-[10px] font-light">Главная</span>
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`flex flex-col items-center space-y-1.5 transition ${activeTab === 'sessions' ? 'text-[#7B61FF]' : 'text-[#A0A0B0] hover:text-white'}`}
            >
              <span className="text-xl">🧘</span>
              <span className="text-[10px] font-light">Сеансы</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center space-y-1.5 transition ${activeTab === 'profile' ? 'text-[#7B61FF]' : 'text-[#A0A0B0] hover:text-white'}`}
            >
              <span className="text-xl">👤</span>
              <span className="text-[10px] font-light">Профиль</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
