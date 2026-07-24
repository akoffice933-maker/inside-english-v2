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
