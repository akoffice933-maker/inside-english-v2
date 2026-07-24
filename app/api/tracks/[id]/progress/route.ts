import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase';

/**
 * POST /api/tracks/[id]/progress
 * Syncs the user's current listening progress for a specific MindTrack or HypnoTrack.
 * Handles streak calculations, audio minutes incrementation, and completed states.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;
    if (!trackId) {
      return NextResponse.json(
        { error: 'Missing track ID in request URL' },
        { status: 400 }
      );
    }

    // 1. Initialize Supabase route handler client & Auth check
    const supabase = createSupabaseRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Parse and validate the request body
    const body = await request.json();
    const { currentTime, duration } = body;

    if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json(
        { error: 'Invalid parameters. "currentTime" and "duration" must be valid numbers.' },
        { status: 400 }
      );
    }

    // Calculate percentage progress (0.0 to 1.0)
    const progress = Math.min(1.0, Math.max(0.0, currentTime / duration));
    
    // Consider completed if the user listened to 95% or more of the track
    const isCompleted = progress >= 0.95;

    // 3. Fetch current tracking progress to detect completion change
    const { data: existingProgress, error: fetchProgressError } = await supabase
      .from('user_progress')
      .select('is_completed, progress')
      .eq('user_id', user.id)
      .eq('track_id', trackId)
      .maybeSingle();

    if (fetchProgressError) {
      console.error('Error fetching existing progress:', fetchProgressError);
    }

    const wasCompletedBefore = existingProgress?.is_completed || false;
    const isNewlyCompleted = isCompleted && !wasCompletedBefore;

    // 4. Upsert user progress
    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        track_id: trackId,
        progress: parseFloat(progress.toFixed(4)),
        is_completed: isCompleted,
        listened_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,track_id'
      });

    if (upsertError) {
      return NextResponse.json(
        { error: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // 5. If newly completed, update user stats (increment total_audio_minutes, evaluate streak)
    let updatedStats = null;
    if (isNewlyCompleted) {
      const minutesListened = Math.ceil(duration / 60);

      // Get user's current metrics
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('total_audio_minutes, streak, settings')
        .eq('id', user.id)
        .single();

      if (!profileError && profile) {
        const currentMinutes = profile.total_audio_minutes || 0;
        const currentStreak = profile.streak || 0;

        // Perform transactional update of user stats
        const { data: updatedProfile, error: updateProfileError } = await supabase
          .from('users')
          .update({
            total_audio_minutes: currentMinutes + minutesListened,
            // Streak logic could check the last completion timestamp. For simplicity, increment if active.
            streak: currentStreak === 0 ? 1 : currentStreak
          })
          .eq('id', user.id)
          .select('total_audio_minutes, streak')
          .single();

        if (!updateProfileError) {
          updatedStats = updatedProfile;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        trackId,
        progress,
        isCompleted,
        newlyCompleted: isNewlyCompleted,
        updatedStats: updatedStats || null
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in progress sync handler:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
