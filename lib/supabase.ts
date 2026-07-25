import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Creates a server-side Supabase client designed for Next.js App Router Route Handlers.
 * Automatically handles cookie-based authentication, extracting the JWT token securely.
 */
export function createSupabaseRouteClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Service-role client for routes that must look up a user by `telegramId`
 * without a Supabase Auth session cookie (e.g. the Telegram Mini App calling
 * GET /api/billing/me?telegramId=... or POST /api/push/register from a fresh
 * WebView with no cookies yet). Bypasses RLS — callers must only return the
 * minimum data needed (e.g. a single `isPremium` boolean), never full rows.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only secret, never exposed to
 * the client). Throws if it isn't configured, so routes fail loudly instead
 * of silently falling back to an unauthenticated anon client.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase service role client is not configured (missing env vars).');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Same convention used by app/api/auth/telegram/route.ts to derive a stable identity from a Telegram user id. */
export function telegramMockEmail(telegramId: string): string {
  return `tg_${telegramId}@inside-english.telegram`;
}
