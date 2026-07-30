'use client';

import React from 'react';
import { usePurchaseFlow } from '@/hooks/usePurchaseFlow';

/**
 * Refactored Premium Subscription Page for Inside English v2.0 (Resolves Yellow Flag #4).
 * 
 * Now delegates all core platform detection, billing logic (Telegram Stars vs RevenueCat IAP),
 * and checkout lifecycles to the decoupled custom hook `usePurchaseFlow` for clean division of concern.
 */
export default function SubscriptionPage({ onPurchaseSuccess }: { onPurchaseSuccess?: () => void }) {
  const {
    selectedPlan,
    setSelectedPlan,
    offerings,
    isLoading,
    errorMessage,
    isTelegramMiniApp,
    handlePurchase,
    handleRestorePurchases
  } = usePurchaseFlow(onPurchaseSuccess);

  return (
    <div className="min-h-screen bg-[#0D0D14] text-white flex flex-col justify-between py-8 px-6 font-sans relative overflow-hidden select-none">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full blur-[120px] bg-[#6C3CE1]/30 pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full blur-[120px] bg-[#E94057]/20 pointer-events-none" />

      {/* Header */}
      <div className="space-y-2 text-center mt-6 relative z-10">
        <span className="text-4xl">✨</span>
        <h1 className="text-2xl font-bold tracking-tight font-serif bg-gradient-to-r from-[#6C3CE1] to-[#E94057] bg-clip-text text-transparent">
          Inside English Premium
        </h1>
        <p className="text-xs text-[#A0A0B0] font-light max-w-xs mx-auto">
          Осознанное погружение в английский язык без ограничений и стресса.
        </p>
      </div>

      {/* Premium Features List */}
      <div className="space-y-4 my-8 relative z-10 max-w-sm mx-auto w-full bg-[#1A1A2E]/30 border border-white/5 p-5 rounded-3xl backdrop-blur-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7B61FF] mb-2 text-center">Возможности Premium:</h3>
        
        <div className="space-y-3.5 text-xs font-light text-[#A0A0B0]">
          <div className="flex items-start space-x-3">
            <span className="text-sm">🎧</span>
            <div>
              <p className="font-semibold text-white">Все MindTracks и ГипноТреки</p>
              <p className="text-[11px] mt-0.5">Полный доступ к 15+ профессиональным аудио-практикам.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-sm">🎤</span>
            <div>
              <p className="font-semibold text-white">Безлимитный AI-Shadowing</p>
              <p className="text-[11px] mt-0.5">Точный пословный анализ произношения через нейросеть Whisper.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-sm">🌙</span>
            <div>
              <p className="font-semibold text-white">Офлайн прослушивание</p>
              <p className="text-[11px] mt-0.5">Скачивайте треки в память телефона и практикуйтесь без интернета.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-sm">📊</span>
            <div>
              <p className="font-semibold text-white">Глубокая аналитика баланса</p>
              <p className="text-[11px] mt-0.5">Полная статистика в Колесе Баланса и персональные рекомендации.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Selection Plans */}
      <div className="space-y-3 relative z-10 max-w-sm mx-auto w-full">
        {offerings.map((pkg) => {
          const isAnnual = pkg.packageType === 'ANNUAL';
          const planKey = isAnnual ? 'annual' : 'monthly';
          const isSelected = selectedPlan === planKey;

          return (
            <div
              key={pkg.identifier}
              onClick={() => setSelectedPlan(planKey)}
              className={`p-4 rounded-3xl border transition cursor-pointer flex items-center justify-between relative ${
                isSelected 
                  ? 'bg-[#6C3CE1]/15 border-[#6C3CE1] shadow-lg shadow-[#6C3CE1]/10' 
                  : 'bg-[#1A1A2E]/50 border-white/5 hover:border-white/10'
              }`}
            >
              {isAnnual && (
                <span className="absolute top-[-10px] right-4 bg-gradient-to-r from-[#6C3CE1] to-[#E94057] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Скидка -50%
                </span>
              )}
              
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-[#6C3CE1] bg-[#6C3CE1]' : 'border-white/20'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold">{isAnnual ? 'Годовой доступ' : 'Месячный доступ'}</h4>
                  <p className="text-[10px] text-[#A0A0B0] font-light mt-0.5">
                    {isAnnual ? 'Выгодный план на 12 месяцев' : 'Гибкая оплата каждый месяц'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-extrabold">{pkg.product.priceString}</p>
                <p className="text-[9px] text-[#A0A0B0] font-light mt-0.5">
                  {isAnnual ? (isTelegramMiniApp ? 'экономия 150 🌟' : 'всего $4.99/мес.') : 'отмена в любой момент'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer & CTA Buttons */}
      <div className="space-y-4 mt-8 relative z-10 max-w-sm mx-auto w-full text-center">
        {errorMessage && (
          <p className="text-xs text-red-400 bg-red-400/10 py-2.5 px-4 rounded-xl border border-red-400/20">
            ⚠️ {errorMessage}
          </p>
        )}

        <button
          onClick={handlePurchase}
          disabled={isLoading}
          className={`w-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] hover:brightness-110 active:scale-[0.98] py-3.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-[#6C3CE1]/25 flex items-center justify-center ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            isTelegramMiniApp
              ? `Оплатить ${selectedPlan === 'annual' ? '750 🌟' : '150 🌟'}`
              : `Оформить за ${selectedPlan === 'annual' ? '$59.99 / год' : '$9.99 / мес'}`
          )}
        </button>

        <div className="flex justify-around text-[10px] text-[#A0A0B0] font-light pt-2">
          {!isTelegramMiniApp && <button onClick={handleRestorePurchases} className="hover:text-white transition">Восстановить покупки</button>}
          {!isTelegramMiniApp && <span>•</span>}
          <a href="/privacy" className="hover:text-white transition">Политика конфиденциальности</a>
          <span>•</span>
          <a href="/terms" className="hover:text-white transition">Условия использования</a>
        </div>
      </div>

    </div>
  );
}
