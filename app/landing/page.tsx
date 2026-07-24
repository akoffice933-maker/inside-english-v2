'use client';

import React, { useState } from 'react';

export default function MarketingLandingPage() {
  const [activeTab, setActiveState] = useState<'relax' | 'energy' | 'sleep'>('relax');

  // Interactive mood feature triggers for demo preview
  const moodPreviews = {
    relax: {
      emoji: '🧘',
      title: 'Расслабление и природа',
      text: 'Изучайте язык под шелест листвы, шум океана и мягкие расслабляющие тексты. Никакого стресса — только плавное погружение.',
      gradient: 'from-[#0A5C36] to-[#022E1B]',
      sample: 'Сегодня я проснулся early. Солнце is shining ярко. Я чувствую calm...'
    },
    energy: {
      emoji: '⚡',
      title: 'Энергия и фокус',
      text: 'Динамичные MindTracks о бизнесе, саморазвитии и мотивации. Зарядитесь уверенностью на английском перед началом рабочего дня.',
      gradient: 'from-[#6C3CE1] to-[#E94057]',
      sample: 'I am ready to build my dream. Каждый шаг leads to success...'
    },
    sleep: {
      emoji: '🌙',
      title: 'Гипно-сон и медитации',
      text: 'Медленные речевые сессии перед сном. Мягкий голос погрузит вас в сон, транслируя базовые фразы прямо в подсознание.',
      gradient: 'from-[#2B1B4D] to-[#1A1A2E]',
      sample: 'Close your eyes. Глубокий вдох... You are safe. Засыпай...'
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D14] text-white font-sans selection:bg-[#6C3CE1]/30 overflow-x-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-20 pb-16 px-6 text-center space-y-8 max-w-2xl mx-auto">
        <div className="absolute top-[-100px] left-1/2 transform -translate-x-1/2 w-[350px] h-[350px] rounded-full blur-[130px] bg-[#6C3CE1]/20 pointer-events-none z-0" />

        <div className="space-y-4 relative z-10">
          <span className="bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/20 text-[10px] font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
            Экосистема Inside English v2.0
          </span>
          <h1 className="text-4xl md:text-5xl font-light font-serif tracking-tight leading-tight mt-3">
            Язык через <br />
            <span className="font-semibold bg-gradient-to-r from-[#6C3CE1] to-[#E94057] bg-clip-text text-transparent">
              погружение и осознанность
            </span>
          </h1>
          <p className="text-sm md:text-base text-[#A0A0B0] font-light max-w-md mx-auto leading-relaxed">
            Забудьте про зубрежку, таймеры и стресс. Изучайте английский как приятный утренний ритуал или вечернюю медитацию под мягкие гипно-треки.
          </p>
        </div>

        {/* Core CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3.5 relative z-10 max-w-sm mx-auto">
          <a 
            href="https://t.me/InsideEnglish_bot/app" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 py-3.5 px-6 rounded-2xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-[#6C3CE1]/20 flex items-center justify-center space-x-2 text-white"
          >
            <span>🚀 Открыть в Telegram</span>
          </a>
          <a 
            href="/demo" 
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 py-3.5 px-6 rounded-2xl text-xs font-bold tracking-wider uppercase transition text-white"
          >
            Попробовать Web-версию
          </a>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION: MOOD-BASED LEARNING */}
      <section className="px-6 py-12 max-w-md mx-auto space-y-8 relative">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight font-serif">Ваше настроение — ваш учебник</h2>
          <p className="text-xs text-[#A0A0B0] font-light">Выберите ваше эмоциональное состояние, а система сама подберет идеальную практику.</p>
        </div>

        {/* Tab triggers */}
        <div className="grid grid-cols-3 gap-2 bg-[#1A1A2E]/40 p-1.5 rounded-2xl border border-white/5">
          {Object.keys(moodPreviews).map((key) => {
            const isSelected = activeTab === key;
            const item = moodPreviews[key as keyof typeof moodPreviews];
            return (
              <button
                key={key}
                onClick={() => setActiveState(key as any)}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-[#6C3CE1]/20 border border-[#6C3CE1]/40 text-white' 
                    : 'text-[#A0A0B0] hover:text-white'
                }`}
              >
                <span className="text-lg mb-1">{item.emoji}</span>
                <span className="text-[10px] font-semibold">{key === 'relax' ? 'Расслабиться' : key === 'energy' ? 'Настроиться' : 'Ко сну'}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Card Preview */}
        <div className="glass-panel p-5 rounded-3xl space-y-4 shadow-xl border border-white/5 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl" />
          
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold flex items-center space-x-2">
              <span>{moodPreviews[activeTab].emoji}</span>
              <span>{moodPreviews[activeTab].title}</span>
            </h3>
            <p className="text-xs text-[#A0A0B0] font-light leading-relaxed">
              {moodPreviews[activeTab].text}
            </p>
          </div>

          {/* Interactive Player Text Highlight Demo */}
          <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2">
            <span className="text-[9px] text-[#7B61FF] font-bold uppercase tracking-wider">Демо-звучание:</span>
            <p className="text-xs font-serif italic text-white/90 leading-relaxed">
              {moodPreviews[activeTab].sample}
            </p>
            <div className="w-full bg-[#1F1F35] h-1 rounded-full mt-2 relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#6C3CE1] to-[#E94057] transition-all duration-1000"
                style={{ width: activeTab === 'relax' ? '45%' : activeTab === 'energy' ? '75%' : '20%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES GRID */}
      <section className="px-6 py-12 max-w-md mx-auto space-y-8">
        <h2 className="text-xl font-bold tracking-tight font-serif text-center">Почему Inside English v2.0?</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="glass-panel p-5 rounded-3xl flex space-x-4 items-start">
            <span className="text-2xl p-3 bg-[#6C3CE1]/10 rounded-2xl">🧘</span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Никакого геймификационного стресса</h4>
              <p className="text-xs text-[#A0A0B0] font-light leading-relaxed">
                Мы не отнимаем жизни, не заводим таймеры и не заставляем конкурировать в таблицах лидеров. Только комфортный темп.
              </p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl flex space-x-4 items-start">
            <span className="text-2xl p-3 bg-[#E94057]/10 rounded-2xl">🎤</span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Интерактивный ИИ-Shadowing</h4>
              <p className="text-xs text-[#A0A0B0] font-light leading-relaxed">
                Повторяйте фразы за диктором. Наш искусственный интеллект проанализирует произношение каждого слова и мягко укажет на ошибки.
              </p>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl flex space-x-4 items-start">
            <span className="text-2xl p-3 bg-yellow-500/10 rounded-2xl">📊</span>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Осознанное Колесо Баланса</h4>
              <p className="text-xs text-[#A0A0B0] font-light leading-relaxed">
                Отслеживайте прогресс в интуитивном Колесе Баланса. Никаких сухих графиков — только визуальный баланс навыков.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PLATFORMS / DOWNLOADS CTA */}
      <section className="px-6 py-12 max-w-md mx-auto space-y-8 text-center relative">
        <div className="absolute bottom-[-100px] left-1/2 transform -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-[120px] bg-[#E94057]/15 pointer-events-none z-0" />

        <div className="space-y-2 relative z-10">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight font-serif">Занимайтесь везде</h2>
          <p className="text-xs text-[#A0A0B0] font-light">Доступно на любом вашем устройстве с автоматической синхронизацией прогресса через Supabase Cloud.</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3 relative z-10">
          <a 
            href="https://t.me/InsideEnglish_bot/app" 
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#1A1A2E]/60 border border-white/5 hover:border-[#7B61FF]/40 py-4 px-5 rounded-2xl flex items-center justify-between transition-all"
          >
            <div className="flex items-center space-x-3.5">
              <span className="text-xl">✈️</span>
              <div className="text-left">
                <h4 className="text-xs font-bold">Telegram Mini App</h4>
                <p className="text-[10px] text-[#A0A0B0] font-light mt-0.5">Запуск мгновенно без установки</p>
              </div>
            </div>
            <span className="text-xs text-[#7B61FF]">Открыть →</span>
          </a>

          <div 
            className="w-full bg-[#1A1A2E]/60 border border-white/5 py-4 px-5 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center space-x-3.5">
              <span className="text-xl">🍏</span>
              <div className="text-left">
                <h4 className="text-xs font-bold">iOS App Store</h4>
                <p className="text-[10px] text-[#A0A0B0] font-light mt-0.5">Встроенные покупки и фоновый звук</p>
              </div>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider text-white font-bold">Скоро</span>
          </div>

          <div 
            className="w-full bg-[#1A1A2E]/60 border border-white/5 py-4 px-5 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center space-x-3.5">
              <span className="text-xl">📲</span>
              <div className="text-left">
                <h4 className="text-xs font-bold">PWA Web App</h4>
                <p className="text-[10px] text-[#A0A0B0] font-light mt-0.5">Автономная работа на любом смартфоне</p>
              </div>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider text-white font-bold">Доступно</span>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-[#A0A0B0] space-y-2">
        <p>© {new Date().getFullYear()} Inside English v2.0. Все права защищены.</p>
        <p className="text-[10px] font-light">Разработано с заботой о вашей психологической осознанности. 🧘</p>
      </footer>

    </div>
  );
}
