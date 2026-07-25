import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient, telegramMockEmail } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/billing/me?telegramId=...
 *
 * Returns { isPremium: boolean } for the Telegram user identified by
 * telegramId. Adapter route for the new dashboard/profile pages, which
 * poll this endpoint instead of holding a Supabase session cookie.
 * Backed by the existing Supabase `users.settings->>'is_premium'` flag
 * (same field the RevenueCat webhook flips) — no schema changes.
 *
 * Only ever returns a boolean, never the underlying user row.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { limited } = await isRateLimited(`rate_limit_billing_me_${ip}`, 60, 60000); // 60 req/min per IP
  if (limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const telegramId = request.nextUrl.searchParams.get('telegramId');
  if (!telegramId) {
    return NextResponse.json({ isPremium: false });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('users')
      .select('settings')
      .eq('email', telegramMockEmail(telegramId))
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ isPremium: false });
    }

    const isPremium = (data.settings as Record<string, unknown> | null)?.is_premium === true;
    return NextResponse.json({ isPremium });
  } catch (err) {
    console.error('[billing/me] lookup failed:', err);
    // Fail closed on the premium flag, but don't break the client poll loop.
    return NextResponse.json({ isPremium: false });
  }
}
