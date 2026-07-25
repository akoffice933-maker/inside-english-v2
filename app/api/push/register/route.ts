import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient, telegramMockEmail } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';

type Body = {
  token: string;
  telegramId?: string;
  platform?: string;
};

/**
 * POST /api/push/register
 * body: { token, telegramId?, platform? }
 *
 * Adapter route for the Profile page's push-notification toggle
 * (lib/notifications.ts -> syncPushToken). Persists the device token into
 * the existing `public.user_push_tokens` table (see push_tokens_migration.sql),
 * resolving the Supabase user by the same telegramId -> mock-email convention
 * used during Telegram auth. No schema changes.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const { limited } = await isRateLimited(`rate_limit_push_register_${ip}`, 10, 60000); // 10 req/min per IP
  if (limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
  }
  if (!body.telegramId) {
    // Nothing to link the token to yet (e.g. web session without Telegram identity).
    // Not an error — just a no-op so the client doesn't retry forever.
    return NextResponse.json({ ok: true, linked: false });
  }

  try {
    const supabase = createSupabaseServiceClient();

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', telegramMockEmail(body.telegramId))
      .maybeSingle();

    if (userError || !userRow) {
      return NextResponse.json({ ok: true, linked: false });
    }

    const { error: upsertError } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userRow.id,
          token: body.token,
          platform: body.platform || 'web',
        },
        { onConflict: 'token' },
      );

    if (upsertError) {
      console.error('[push/register] upsert failed:', upsertError.message);
      return NextResponse.json({ error: 'Failed to save token.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, linked: true });
  } catch (err) {
    console.error('[push/register] unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
