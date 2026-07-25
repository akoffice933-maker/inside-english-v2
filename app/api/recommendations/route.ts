import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient, telegramMockEmail } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';
import type { Track } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recommendations?state=calm|focus|energy|sleep&telegramId=...
 *
 * Adapter route for the new dashboard/library pages, which expect a plain
 * `{ tracks: Track[] }` shape (see lib/types.ts) rather than the older
 * `{ recommendations: [...] }` scoring response from /api/user/recommendations.
 *
 * Reads from the existing Supabase `tracks` + `track_contents` tables
 * (content stays behind the premium-gated RLS policy on track_contents —
 * see schema.sql). `isPremium` for the caller is resolved the same way as
 * /api/billing/me, purely to decide whether tokens are attached; the
 * client still enforces the lock UI via `track.isPremium` on each track.
 *
 * See state_categories_migration.sql for the calm/focus category mapping.
 */

// Old schema only has 3 states (relax/energy/sleep). New frontend has 4
// categories. Map each new category onto the legacy label(s) that should
// satisfy it, so already-seeded 'relax' tracks keep surfacing under both
// 'calm' and 'focus' until they're explicitly reclassified.
const STATE_MAP: Record<string, string[]> = {
  calm: ['calm', 'relax'],
  focus: ['focus', 'relax'],
  energy: ['energy'],
  sleep: ['sleep'],
};

/**
 * Old tracks.cover_gradient stores a raw CSS gradient string, e.g.
 * "linear-gradient(135deg, #6C3CE1 0%, #E94057 100%)". The new UI applies
 * coverGradient as Tailwind class fragments: `bg-gradient-to-br ${gradient}`.
 * Extract the hex stops and rebuild a Tailwind-compatible "from-[#..] to-[#..]".
 */
function toTailwindGradient(cssGradient: string | null | undefined): string {
  if (!cssGradient) return 'from-[#6C3CE1] to-[#E94057]';
  const hexes = cssGradient.match(/#[0-9a-fA-F]{6}/g);
  if (!hexes || hexes.length === 0) return 'from-[#6C3CE1] to-[#E94057]';
  const from = hexes[0];
  const to = hexes[hexes.length - 1];
  return `from-[${from}] to-[${to}]`;
}

function slugify(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return base || id;
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { limited } = await isRateLimited(`rate_limit_recommendations_${ip}`, 60, 60000); // 60 req/min per IP
  if (limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const category = request.nextUrl.searchParams.get('state') || 'calm';
  const telegramId = request.nextUrl.searchParams.get('telegramId');
  const legacyStates = STATE_MAP[category] ?? [category];

  try {
    const supabase = createSupabaseServiceClient();

    let isPremiumUser = false;
    if (telegramId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('settings')
        .eq('email', telegramMockEmail(telegramId))
        .maybeSingle();
      isPremiumUser = (userRow?.settings as Record<string, unknown> | null)?.is_premium === true;
    }

    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, title, description, state, audio_url, duration, cover_gradient, is_premium, created_at')
      .in('state', legacyStates)
      .order('created_at', { ascending: false })
      .limit(10);

    if (tracksError) {
      console.error('[recommendations] tracks query failed:', tracksError.message);
      return NextResponse.json({ tracks: [] });
    }
    if (!tracks || tracks.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    // Only fetch protected token content for tracks the caller is allowed to see
    // (free tracks, or premium tracks when the caller is a premium subscriber) —
    // mirrors the RLS policy on track_contents so the service-role client doesn't
    // accidentally hand out premium transcripts to free users via this route.
    const readableIds = tracks.filter((t) => !t.is_premium || isPremiumUser).map((t) => t.id);
    const tokensById = new Map<string, unknown>();
    if (readableIds.length > 0) {
      const { data: contents } = await supabase
        .from('track_contents')
        .select('track_id, tokens')
        .in('track_id', readableIds);
      contents?.forEach((c) => tokensById.set(c.track_id, c.tokens));
    }

    const shaped: Track[] = tracks.map((t) => ({
      id: t.id,
      slug: slugify(t.title, t.id),
      title: t.title,
      artist: 'Inside English',
      description: t.description,
      category: category as Track['category'],
      coverGradient: toTailwindGradient(t.cover_gradient),
      durationSec: t.duration,
      audioUrl: t.audio_url,
      tokens: (tokensById.get(t.id) as Track['tokens']) ?? [],
      isPremium: t.is_premium,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ tracks: shaped });
  } catch (err) {
    console.error('[recommendations] unexpected error:', err);
    return NextResponse.json({ tracks: [] });
  }
}
