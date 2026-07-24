import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase';

// Level numeric values for relative difficulty scoring
const LEVEL_VALUES: Record<string, number> = {
  'A0': 0,
  'A1': 1,
  'A2': 2,
  'B1': 3,
  'B2': 4,
  'C1': 5
};

/**
 * GET /api/user/recommendations
 * 
 * Query parameters:
 * - ?state=relax|energy|sleep (Optional: defaults to user's preferred state)
 * - ?limit=5 (Optional: defaults to 5)
 * 
 * Algorithm: Intelligent Content Recommendation Engine based on Mood and Profile
 * 1. Checks Auth and retrieves user's level and preferred state.
 * 2. Fetches tracks filtered by the active mood state.
 * 3. Fetches the user's progress history.
 * 4. Ranks tracks dynamically using a weighted scoring model:
 *    - Level Match (+10 pts for exact, +5 pts for +/-1 level gap)
 *    - Continuation Boost (+30 pts for partially listened tracks)
 *    - Freshness Boost (+20 pts for completely new, unplayed tracks)
 *    - Finished Penalty (-15 pts for completed tracks to prioritize new content)
 *    - Format-Mood Alignment Boost (+15 pts for HypnoTracks in 'sleep' / MindTracks in 'energy')
 * 5. Returns sorted recommendations.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryState = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    // 1. Initialize Supabase Server Client & Auth
    const supabase = createSupabaseRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch User Profile for level and preferred state fallbacks
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('level, preferred_state, settings')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const userLevel = profile.level || 'A1';
    const targetState = queryState || profile.preferred_state || 'relax';

    // 3. Fetch all tracks corresponding to the target state
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .eq('state', targetState);

    if (tracksError) {
      return NextResponse.json({ error: `Database error: ${tracksError.message}` }, { status: 500 });
    }

    if (!tracks || tracks.length === 0) {
      return NextResponse.json({ 
        message: 'No tracks found for this state.', 
        recommendations: [] 
      }, { status: 200 });
    }

    // 4. Fetch the user's progress history for matching tracks
    const { data: progressList, error: progressError } = await supabase
      .from('user_progress')
      .select('track_id, progress, is_completed')
      .eq('user_id', user.id);

    if (progressError) {
      console.error('Error fetching progress for recommendation scoring:', progressError);
    }

    // Map user progress by track_id for instant O(1) lookups during scoring
    const progressMap = new Map<string, { progress: number; is_completed: boolean }>();
    if (progressList) {
      progressList.forEach((p) => {
        progressMap.set(p.track_id, {
          progress: p.progress,
          is_completed: p.is_completed
        });
      });
    }

    // 5. Dynamic scoring engine
    const scoredTracks = tracks.map((track) => {
      let score = 0;
      const progressRecord = progressMap.get(track.id);

      // --- SCORE COMPONENT A: LEVEL MATCHING ---
      const userLevelVal = LEVEL_VALUES[userLevel] ?? 1;
      const trackLevelVal = LEVEL_VALUES[track.level] ?? 1;
      const levelDiff = Math.abs(userLevelVal - trackLevelVal);

      if (levelDiff === 0) {
        score += 15; // Perfect alignment with user's current capabilities
      } else if (levelDiff === 1) {
        score += 8;  // Slightly easier or slightly challenging (good for growth)
      } else if (levelDiff === 2) {
        score += 2;  // Acceptable but not optimal
      } else {
        score -= 10; // Too easy or too hard
      }

      // --- SCORE COMPONENT B: PLAYBACK PROGRESS ---
      if (!progressRecord) {
        // Completely fresh track
        score += 25;
      } else if (progressRecord.is_completed) {
        // Already fully listened
        score -= 15; // Low priority (already completed)
      } else if (progressRecord.progress > 0 && progressRecord.progress < 0.95) {
        // In Progress - Highest priority so they finish what they started
        score += 40;
      }

      // --- SCORE COMPONENT C: FORMAT-MOOD ALIGNMENT ---
      // For SLEEP, prioritize hypno-sessions heavily
      if (targetState === 'sleep' && track.type === 'hypno') {
        score += 15;
      }
      // For ENERGY, prioritize active MindTracks
      if (targetState === 'energy' && track.type === 'mindtrack') {
        score += 15;
      }

      // --- SCORE COMPONENT D: PREMIUM PREFERENCE ---
      // If user is premium, prioritize premium tracks slightly.
      // If user is free, keep free tracks higher but include 1 premium track near top for upselling.
      const isPremiumUser = profile.settings?.is_premium === true;
      if (track.is_premium) {
        if (isPremiumUser) {
          score += 10; // Showcase high quality pro tracks first
        } else {
          score -= 5;  // Push down slightly for free users, but keep visible
        }
      } else {
        if (!isPremiumUser) {
          score += 10; // Direct free users to free content first
        }
      }

      return {
        ...track,
        recommendationScore: score,
        userProgress: progressRecord || null
      };
    });

    // 6. Sort tracks by score descending and take the requested limit
    const recommendations = scoredTracks
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      meta: {
        state: targetState,
        level: userLevel,
        totalPool: tracks.length,
        limit
      },
      recommendations
    }, { status: 200 });

  } catch (error: any) {
    console.error('Recommendations routing exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
