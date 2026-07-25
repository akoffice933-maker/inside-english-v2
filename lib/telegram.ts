/**
 * Telegram Mini App (TMA) Client SDK Integration Wrapper
 * 
 * Safely interacts with the window.Telegram.WebApp JavaScript SDK inside Next.js (SSR safe).
 * Provides hooks for Haptics (Vibration), Main Button management, Back Button navigation, and InitData.
 */

interface WebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export class TelegramSDK {
  // Safe helper to check if running inside Telegram WebApp
  static isTMA(): boolean {
    if (typeof window === 'undefined') return false;
    return (window as any).Telegram?.WebApp?.initData !== '';
  }

  // Get raw window.Telegram.WebApp instance
  static getWebApp() {
    if (typeof window === 'undefined') return null;
    return (window as any).Telegram?.WebApp || null;
  }

  // Get parsed initData string for backend verification
  static getInitData(): string {
    const webApp = this.getWebApp();
    return webApp ? webApp.initData : '';
  }

  // Get user details from Telegram
  static getUser(): WebAppUser | null {
    const webApp = this.getWebApp();
    if (webApp && webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
      return webApp.initDataUnsafe.user;
    }
    return null;
  }

  // Detect the underlying client platform (ios | android | macos | web | tdesktop | ...)
  static getPlatform(): string | null {
    const webApp = this.getWebApp();
    return webApp?.platform || null;
  }

  // Ready indicator: signals Telegram that the app has loaded and can render
  static ready() {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.ready();
      webApp.expand(); // Expand WebView to full height immediately
    }
  }

  // Trigger haptic feedback (vibration) for a premium tactile feel on click
  static triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | 'success' | 'warning' | 'error' = 'light') {
    const webApp = this.getWebApp();
    if (webApp && webApp.HapticFeedback) {
      if (['success', 'warning', 'error'].includes(type)) {
        webApp.HapticFeedback.notificationOccurred(type);
      } else {
        webApp.HapticFeedback.impactOccurred(type);
      }
    }
  }

  // Setup the native Telegram main CTA button (e.g. for payments or checkout actions)
  static configureMainButton(text: string, onClick: () => void, isVisible = true) {
    const webApp = this.getWebApp();
    if (webApp && webApp.MainButton) {
      webApp.MainButton.text = text;
      webApp.MainButton.onClick(onClick);
      if (isVisible) {
        webApp.MainButton.show();
      } else {
        webApp.MainButton.hide();
      }
    }
  }

  static hideMainButton() {
    const webApp = this.getWebApp();
    if (webApp && webApp.MainButton) {
      webApp.MainButton.hide();
    }
  }

  // Setup the native back button inside Telegram's upper header bar
  static configureBackButton(onBackClick: () => void, isVisible = true) {
    const webApp = this.getWebApp();
    if (webApp && webApp.BackButton) {
      if (isVisible) {
        webApp.BackButton.show();
        webApp.BackButton.onClick(onBackClick);
      } else {
        webApp.BackButton.hide();
      }
    }
  }

  // Close the Mini App
  static close() {
    const webApp = this.getWebApp();
    if (webApp) {
      webApp.close();
    }
  }
}
