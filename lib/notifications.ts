import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';

/**
 * Push Notifications Registration and Action Handler for Inside English v2.0
 */
export async function initializePushNotifications() {
  // 1. Only execute in a native iOS or Android app context
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push Notifications] Skipped. Not running on a native device.');
    return;
  }

  try {
    // 2. Request user permissions for notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Push Notifications] Permission denied by the user.');
      return;
    }

    // 3. Register the device with Apple APNS or Google FCM
    await PushNotifications.register();

    // Fix Vulnerability: Lazy load Supabase client only when executing on client-side native device,
    // preventing compilation crashes during static export pre-rendering due to empty env keys.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Push Notifications] Missing Supabase credentials. Cannot register device tokens.');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 4. Token generation listener: saves token to Supabase database
    await PushNotifications.addListener('registration', async (token) => {
      const deviceToken = token.value;
      const platform = Capacitor.getPlatform(); // 'ios' or 'android'

      console.log(`[Push Notifications] Device registered. Token: ${deviceToken}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[Push Notifications] No authenticated user. Cannot link device token.');
        return;
      }

      // Upsert push token into public.user_push_tokens table
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          token: deviceToken,
          platform: platform
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('[Push Notifications] Failed to save token to Supabase:', error.message);
      } else {
        console.log('[Push Notifications] Token securely synced to database.');
      }
    });

    // Handle token registration failures
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push Notifications] Registration failed:', error.error);
    });

    // 5. Active Foreground Notification Event Listener
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push Notifications] Notification received in foreground:', notification);
    });

    // 6. Notification Click Action Listener
    await PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
      const data = notificationAction.notification.data;
      console.log('[Push Notifications] Notification clicked. Target Action:', data);

      if (data && data.trackId) {
        window.location.href = `/tracks/${data.trackId}`;
      }
    });

  } catch (error) {
    console.error('[Push Notifications] Unexpected initialization error:', error);
  }
}

/* ============================================================================
 * Browser-facing helpers used by the Profile page's push-notification toggle.
 * These cover both the Capacitor native path (delegating to the same
 * window.Capacitor.Plugins.PushNotifications bridge as initializePushNotifications
 * above) and a plain browser Notifications-API fallback for the PWA/web build.
 * The resulting token is sent to POST /api/push/register (Supabase-backed).
 * ============================================================================ */

type CapacitorPushBridge = {
  register: () => Promise<void>;
  requestPermissions: () => Promise<{ receive: string }>;
  addListener: (
    event: 'registration',
    cb: (token: { value: string }) => void,
  ) => Promise<{ remove: () => void }>;
};

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
      Plugins?: { PushNotifications?: CapacitorPushBridge };
    };
  }
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Registers the device for push notifications. Returns the device token if
 * registration succeeded, otherwise null.
 */
export async function registerPushNotifications(): Promise<string | null> {
  // Capacitor native path (iOS / Android)
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    try {
      const Push = window.Capacitor.Plugins?.PushNotifications;
      if (!Push) return null;
      const perm = await Push.requestPermissions();
      if (perm.receive !== 'granted') return null;
      await Push.register();
      return await new Promise<string | null>((resolve) => {
        const timeout = window.setTimeout(() => resolve(null), 8000);
        Push.addListener('registration', (token) => {
          window.clearTimeout(timeout);
          resolve(token.value);
        });
      });
    } catch (err) {
      console.warn('[notifications] Capacitor push registration failed', err);
      return null;
    }
  }

  // Web fallback
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  if (Notification.permission === 'granted') return 'web-permission-granted';
  if (Notification.permission === 'denied') return null;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'web-permission-granted' : null;
  } catch {
    return null;
  }
}

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/** Send the registration token to our Supabase-backed backend. */
export async function syncPushToken(token: string, telegramId?: string): Promise<void> {
  try {
    await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, telegramId, platform: detectPlatform() }),
    });
  } catch (err) {
    console.warn('[notifications] failed to sync token', err);
  }
}

function detectPlatform(): string {
  if (typeof window === 'undefined') return 'server';
  if (window.Capacitor?.isNativePlatform?.()) return window.Capacitor.getPlatform();
  return 'web';
}
