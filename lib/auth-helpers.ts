import { createSupabaseRouteClient, createSupabaseServiceClient, telegramMockEmail } from '@/lib/supabase';

interface AuthenticatedUser {
  id: string;
  email: string;
  settings: any;
}

/**
 * Production-grade Dual-Identity Authentication Helper for Inside English v2.0 (Resolves Blocker #2).
 * Bridges both worlds (Telegram Mini App and normal Web PWA) securely:
 * 1. If telegramId is passed (TMA Path) ➡️ resolves the user via service role client and mock email.
 * 2. If no telegramId (Web Path) ➡️ resolves the user via standard Supabase Cookie session.
 * 
 * Bypasses RLS only to read settings securely on the server-side, preventing client-side spoofing.
 */
export async function resolveUserFromRequest(
  request: Request,
  telegramId?: string | null
): Promise<AuthenticatedUser | null> {
  // Scenario A: Telegram Mini App Path (Verified telegramId)
  if (telegramId) {
    try {
      const supabaseAdmin = createSupabaseServiceClient();
      const mockEmail = telegramMockEmail(telegramId);
      
      const { data: profile, error } = await supabaseAdmin
        .from('users')
        .select('id, email, settings')
        .eq('email', mockEmail)
        .maybeSingle();

      if (error || !profile) {
        console.warn(`[Auth Helper] Failed to resolve Telegram user: ${mockEmail}`);
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        settings: profile.settings || {}
      };
    } catch (err) {
      console.error('[Auth Helper] Telegram ID authentication exception:', err);
      return null;
    }
  }

  // Scenario B: Standard Web PWA Path (Cookie Session)
  try {
    const supabase = createSupabaseRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.id || !user.email) {
      return null;
    }

    // Securely read settings via service_role to avoid client RLS restrictions during backend checks
    const supabaseAdmin = createSupabaseServiceClient();
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email,
      settings: profile?.settings || {}
    };
  } catch (err) {
    console.error('[Auth Helper] Cookie-based authentication exception:', err);
    return null;
  }
}
