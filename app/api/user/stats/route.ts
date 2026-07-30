import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient, createSupabaseRouteClient, telegramMockEmail } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/user/stats
 * 
 * Production-grade Database-Aware User Progress Statistics Endpoint (Resolves Блокер #3).
 * Fetches real active metrics for the dashboard:
 * 1. Total words learned (SELECT count from user_words).
 * 2. Real Average Shadowing Score (SELECT AVG(score) from shadowing_attempts).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. IP-based Rate Limiting (max 60 stats polls per minute per IP)
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_user_stats_${ip}`, 60, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const telegramId = request.nextUrl.searchParams.get('telegramId');

    let userId: string | null = null;
    let supabaseAdmin = createSupabaseServiceClient();

    // 2. Resolve User ID (Dual-Identity Bridge)
    if (telegramId) {
      const mockEmail = telegramMockEmail(telegramId);
      const { data: profile, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', mockEmail)
        .maybeSingle();
      
      if (!error && profile) {
        userId = profile.id;
      }
    } else {
      const supabase = createSupabaseRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ 
        totalWordsLearned: 0, 
        averageShadowingScore: 0,
        streak: 0
      }, { status: 200 });
    }

    // 3. Query actual total words learned from the database
    const { count: wordsCount, error: wordsError } = await supabaseAdmin
      .from('user_words')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (wordsError) {
      console.error('[User Stats API] Failed to fetch total words:', wordsError);
    }

    // 4. Fix Blocker #3: Query real average shadowing score from shadowing_attempts (No more fake score formula!)
    const { data: scoreData, error: scoreError } = await supabaseAdmin
      .from('shadowing_attempts')
      .select('score')
      .eq('user_id', userId);

    let averageScore = 0;
    if (!scoreError && scoreData && scoreData.length > 0) {
      const totalScore = scoreData.reduce((sum, item) => sum + item.score, 0);
      averageScore = Math.round(totalScore / scoreData.length);
    } else if (scoreError) {
      console.error('[User Stats API] Failed to fetch average shadowing score:', scoreError);
    }

    // 5. Query user statistics (streak, audio minutes) directly from profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('total_audio_minutes, streak')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[User Stats API] Failed to fetch user profile metrics:', profileError);
    }

    return NextResponse.json({
      success: true,
      totalWordsLearned: wordsCount || 0,
      averageShadowingScore: averageScore || 0,
      streak: userProfile?.streak || 0
    }, { status: 200 });

  } catch (err: any) {
    console.error('User stats endpoint global exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
