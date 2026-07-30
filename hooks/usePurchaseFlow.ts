'use client';

import { useState, useEffect } from 'react';
import { TelegramSDK } from '@/lib/telegram';
import { createClient } from '@supabase/supabase-js';

export interface OfferingPackage {
  identifier: string;
  packageType: 'MONTHLY' | 'ANNUAL';
  product: {
    title: string;
    description: string;
    priceString: string;
    price: number;
  };
}

/**
 * Custom React Hook for Inside English Premium purchase flows (Resolves Yellow Flag #4).
 * Extracts all state, TMA platform checks, RevenueCat integrations, Telegram Stars checkout,
 * and restore processes away from the UI components.
 * 
 * Fixes Vulnerability #1: Replaces top-level static require() with dynamic, lazy-loaded import()
 * to prevent massive bundle bloat for the 95%+ of users launching on Telegram Mini Apps.
 */
export function usePurchaseFlow(onPurchaseSuccess?: () => void) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [offerings, setOfferings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);
  const [isNativeMobile, setIsNativeMobile] = useState(false);

  // Safe lazy loader for Client-side Supabase connection
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

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    setIsNativeMobile(isNative);

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

      if (!isNative) {
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

        // Lazy-load Purchases SDK at runtime on native mobile (Fixes Vulnerability #1 - Bundle Bloat!)
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        
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

    // Scenario A: Real Telegram Stars Billing inside Telegram
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
          body: JSON.stringify({ 
            plan: selectedPlan,
            telegramId: tgUser ? String(tgUser.id) : undefined 
          }),
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
    if (!isNativeMobile) {
      setTimeout(() => {
        setIsLoading(false);
        alert(`[Имитация покупки] Вы успешно подписались на план "${selectedPlan}"! Статус Premium активен 🎉.`);
        if (onPurchaseSuccess) onPurchaseSuccess();
      }, 2000);
      return;
    }

    // Native StoreKit Purchase Execution
    try {
      // Lazy-load Purchases SDK at runtime (Fixes Vulnerability #1)
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
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

    if (!isNativeMobile) {
      setTimeout(() => {
        setIsLoading(false);
        alert('Покупки успешно восстановлены!');
      }, 1000);
      return;
    }

    try {
      // Lazy-load Purchases SDK at runtime (Fixes Vulnerability #1)
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();
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

  return {
    selectedPlan,
    setSelectedPlan,
    offerings,
    isLoading,
    errorMessage,
    isTelegramMiniApp,
    handlePurchase,
    handleRestorePurchases
  };
}
