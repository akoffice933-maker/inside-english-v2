'use client';

import React, { useState, useEffect } from 'react';
import { TelegramSDK } from '@/lib/telegram';
import { createClient } from '@supabase/supabase-js';

// Safe Dynamic import for RevenueCat Purchases SDK on native platforms
let Purchases: any = null;
if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
  try {
    Purchases = require('@revenuecat/purchases-capacitor').Purchases;
  } catch (e) {
    console.warn('RevenueCat SDK failed to load on non-native runtime', e);
  }
}

interface OfferingPackage {
  identifier: string;
  packageType: 'MONTHLY' | 'ANNUAL';
  product: {
    title: string;
    description: string;
    priceString: string;
    price: number;
  };
}

export default function SubscriptionPage({ onPurchaseSuccess }: { onPurchaseSuccess?: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [offerings, setOfferings] = useState<OfferingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);

  // Safe lazy loader for Client-side Supabase connection (Fixes Eager-init crash vulnerability)
  const getSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  };

  // Load and configure Billing channels on mount
  useEffect(() => {
    const isTMA = TelegramSDK.isTMA();
    setIsTelegramMiniApp(isTMA);

    async function configureAndLoadBilling() {
      // Setup Fallback Mock Offerings first
      const mockOfferings: OfferingPackage[] = [
        {
          identifier: 'monthly_premium',
          packageType: 'MONTHLY',
          product: {
            title: isTMA ? 'Inside Premium Monthly' : 'Inside English Monthly',
            description: 'Доступ ко всем практикам помесячно',
            priceString: isTMA ? '150 🌟' : '$9.99', // Uses Telegram Stars inside Telegram!
            price: isTMA ? 150 : 9.99
          }
        },
        {
          identifier: 'annual_premium',
          packageType: 'ANNUAL',
          product: {
            title: isTMA ? 'Inside Premium Annual' : 'Inside English Annual',
            description: 'Доступ ко всем практикам на 1 год',
            priceString: isTMA ? '750 🌟' : '$59.99', // Telegram Stars for annual
            price: isTMA ? 750 : 59.99
          }
        }
      ];

      if (!Purchases) {
        setOfferings(mockOfferings);
        return;
      }

      // Configure RevenueCat on Native Mobile Platforms (Fixes Vulnerability #2)
      try {
        setIsLoading(true);
        const apiKey = process.env.NEXT_PUBLIC_REVENUE_CAT_API_KEY_IOS || '';
        
        if (!apiKey) {
          console.warn('[RevenueCat] Missing API Key in environmental settings.');
          setOfferings(mockOfferings);
          return;
        }

        // Fetch User Identity to bind subscription securely
        let appUserID = 'anonymous_web_user';
        const tgUser = TelegramSDK.getUser();
        if (tgUser) {
          appUserID = String(tgUser.id);
        } else {
          const supabaseClient = getSupabaseClient();
          if (supabaseClient) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
              appUserID = user.id;
            }
          }
        }

        // Configure RevenueCat singleton before calling getOfferings
        await Purchases.configure({ apiKey, appUserID });
        console.log('[RevenueCat] Successfully configured for user:', appUserID);

        const fetchedOfferings = await Purchases.getOfferings();
        if (fetchedOfferings.current !== null && fetchedOfferings.current.availablePackages.length > 0) {
          setOfferings(fetchedOfferings.current.availablePackages);
        } else {
          setOfferings(mockOfferings);
        }
      } catch (err: any) {
        console.error('[RevenueCat] Init/fetch failed, falling back to mocks:', err);
        setOfferings(mockOfferings);
      } finally {
        setIsLoading(false);
      }
    }

    configureAndLoadBilling();
  }, []);

  const handlePurchase = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // Scenario A: Real Telegram Stars Billing inside Telegram (Fix #5b / Блокер #2)
    if (isTelegramMiniApp) {
      try {
        const tgUser = TelegramSDK.getUser();
        if (!tgUser) {
          setErrorMessage('Ошибка авторизации Telegram. Перезапустите бота.');
          setIsLoading(false);
          return;
        }

        // 1. Fetch real Invoice link from our server API Route
        const response = await fetch('/api/billing/create-invoice-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plan: selectedPlan }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData?.error || 'Failed to generate invoice link');
        }

        const { invoiceLink } = await response.json();

        // 2. Invoke Telegram WebApp Native Stars checkout overlay
        const webApp = TelegramSDK.getWebApp();
        if (webApp && webApp.openInvoice) {
          console.log('[Telegram Stars] Opening native payment invoice link...');
          webApp.openInvoice(invoiceLink, (status: 'paid' | 'cancelled' | 'failed') => {
            setIsLoading(false);
            if (status === 'paid') {
              alert('Спасибо за покупку! Подписка Inside Premium успешно активирована 🎉.');
              if (onPurchaseSuccess) onPurchaseSuccess();
            } else {
              setErrorMessage('Платеж отменен или произошла ошибка при оплате.');
            }
          });
        } else {
          // Web preview simulation if running inside a browser simulating TMA
          setTimeout(() => {
            setIsLoading(false);
            alert(`[Имитация Telegram Stars] Вы успешно оплатили подписку! Доступ Inside Premium активирован.`);
            if (onPurchaseSuccess) onPurchaseSuccess();
          }, 1500);
        }
        return;
      } catch (e: any) {
        console.error('Telegram Stars Checkout Failed:', e);
        setErrorMessage(e.message || 'Ошибка проведения платежа Telegram Stars.');
        setIsLoading(false);
        return;
      }
    }

    // Scenario B: App Store IAP via RevenueCat (For Native iOS builds)
    const targetPackageIdentifier = selectedPlan === 'annual' ? 'annual_premium' : 'monthly_premium';
    const activePackage = offerings.find(pkg => pkg.identifier.includes(targetPackageIdentifier) || pkg.packageType === (selectedPlan === 'annual' ? 'ANNUAL' : 'MONTHLY'));

    if (!activePackage) {
      setErrorMessage('Выбранный тариф временно недоступен.');
      setIsLoading(false);
      return;
    }

    // Web Fallback Simulation
    if (!Purchases) {
      setTimeout(() => {
        setIsLoading(false);
        alert(`[Имитация покупки] Вы успешно подписались на план "${selectedPlan}"! Статус Premium активен 🎉.`);
        if (onPurchaseSuccess) onPurchaseSuccess();
      }, 2000);
      return;
    }

    // Native StoreKit Purchase Execution
    try {
      const { customerInfo } = await Purchases.purchasePackage(activePackage);
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        console.log('Purchase successful! Premium entitlement activated.');
        if (onPurchaseSuccess) onPurchaseSuccess();
      } else {
        setErrorMessage('Ошибка активации подписки. Пожалуйста, свяжитесь с поддержкой.');
      }
    } catch (purchaseError: any) {
      if (!purchaseError.userCancelled) {
        setErrorMessage(purchaseError.message || 'Произошла непредвиденная ошибка при оплате.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!Purchases) {
      setTimeout(() => {
        setIsLoading(false);
        alert('Покупки успешно восстановлены!');
      }, 1000);
      return;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        alert('Премиум подписка успешно восстановлена!');
        if (onPurchaseSuccess) onPurchaseSuccess();
      } else {
        setErrorMessage('Активных подписок для восстановления не обнаружено.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Не удалось восстановить покупки.');
    } finally {
      setIsLoading(false);
    }
  };

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
