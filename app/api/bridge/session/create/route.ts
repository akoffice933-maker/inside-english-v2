import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';
import { resolveUserFromRequest } from '@/lib/auth-helpers';

/**
 * POST /api/bridge/session/create
 * 
 * Securely instantiates a new Inside Bridge (Flow Talk) session.
 * 
 * Access: Restricted to Premium Users only in production.
 * Fixes Blocker: Automatically creates a real database-backed session under the user's ID,
 * completely replacing the hardcoded "demo-session-id" placeholder.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP-based Rate Limiting (max 10 session creations per minute)
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_bridge_session_create_${ip}`, 10, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы слишком часто создаете сессии. Сделайте паузу.' }, { status: 429 });
    }

    const { state = 'relax', telegramId } = await request.json();

    const supabaseAdmin = createSupabaseServiceClient();

    // 2. Resolve User ID (Dual-Identity Bridge)
    const userProfile = await resolveUserFromRequest(request, telegramId);

    // Fallback: If no authenticated user is found, reject in production
    if (!userProfile && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // 3. Strict Premium Gate check
    const isPremiumUser = userProfile?.settings?.is_premium === true;
    if (!isPremiumUser && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Premium-подписка обязательна для использования Inside Bridge.' 
      }, { status: 402 });
    }

    const userId = userProfile?.id || 'anonymous_dev_user';

    // 4. Create record in bridge_sessions table
    console.log(`[Inside Bridge] Creating new session for user ${userId}. State: ${state}`);
    
    const { data: newSession, error: createError } = await supabaseAdmin
      .from('bridge_sessions')
      .insert({
        creator_id: userId,
        state,
        status: 'active'
      })
      .select('id')
      .single();

    if (createError) {
      // Mock Fallback: Permitted only in local DEVELOPMENT / STAGING
      if (process.env.NODE_ENV === 'production') {
        console.error('[Inside Bridge Error] Database insertion failed:', createError.message);
        return NextResponse.json({ error: 'Failed to create bridge session.' }, { status: 500 });
      }

      console.warn('[Inside Bridge] Missing DB configuration. Returning mock session UUID.');
      return NextResponse.json({
        success: true,
        sessionId: '4ecafa35-5be3-18ce-e39c-ca3bd36772b7', // Returns a mock UUID
        is_mocked: true
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      sessionId: newSession.id
    }, { status: 200 });

  } catch (err: any) {
    console.error('Inside Bridge Session Create global exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
