import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/supabase';
import { alignAndEvaluate } from '@/lib/alignment';
import { isRateLimited } from '@/lib/rate-limit';
import { fetchWithTimeout } from '@/lib/fetch-utils';

/**
 * POST /api/tracks/[id]/shadow
 * 
 * Receives multi-part Form Data containing user audio recordings and target text.
 * Uploads audio to 'shadowing-records' private storage and requests Whisper API.
 * 
 * Fixes Vulnerability #5: Prevents silent fake grades in production environment.
 * Fixes Vulnerability #6: Implements authenticated user-based rate limiting (Max 10 requests per minute)
 * to prevent Whisper API billing exploitation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;
    if (!trackId) {
      return NextResponse.json({ error: 'Missing track parameter in URL' }, { status: 400 });
    }

    // 1. Authenticate the User
    const supabase = createSupabaseRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 2. User-based Rate Limiting (extremely secure since they are authenticated)
    const rateLimitKey = `rate_limit_shadow_user_${user.id}`;
    const { limited, remaining, resetTime } = await isRateLimited(rateLimitKey, 10, 60000); // 10 requests per minute

    if (limited) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many speech evaluations. Please wait before recording again.' },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

    // 3. Parse Multipart Form Data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const targetText = formData.get('targetText') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'Missing "audio" file in payload.' }, { status: 400 });
    }
    if (!targetText) {
      return NextResponse.json({ error: 'Missing "targetText" reference string.' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // 4. Upload User Audio Recording to Supabase Private Bucket 'shadowing-records'
    const fileExtension = audioFile.name.split('.').pop() || 'webm';
    const storagePath = `${user.id}/${trackId}/${Date.now()}.${fileExtension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('shadowing-records')
      .upload(storagePath, buffer, {
        contentType: audioFile.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return NextResponse.json({ error: `Storage upload error.` }, { status: 500 });
    }

    // 5. Request OpenAI Whisper Speech-to-Text API
    let transcribedText = '';
    let isMocked = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        const whisperFormData = new FormData();
        const audioBlob = new Blob([buffer], { type: audioFile.type });
        whisperFormData.append('file', audioBlob, `shadow_recording.${fileExtension}`);
        whisperFormData.append('model', 'whisper-1');
        whisperFormData.append('language', 'en');

        // Uses fetchWithTimeout with a strict 15s timeout guard to prevent serverless hanging billing (Vulnerability Fix #2)
        const whisperResponse = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: whisperFormData
        }, 15000);

        if (!whisperResponse.ok) {
          const errData = await whisperResponse.json();
          throw new Error(errData?.error?.message || `Whisper status: ${whisperResponse.status}`);
        }

        const whisperData = await whisperResponse.json();
        transcribedText = whisperData.text || '';
      } catch (whisperErr: any) {
        console.error('Failed to communicate with OpenAI Whisper:', whisperErr);
        return NextResponse.json({ error: 'Speech analysis engine failed.', details: whisperErr.message }, { status: 502 });
      }
    } else {
      // Reject fallback mock mode if we are explicitly running in PRODUCTION.
      if (process.env.NODE_ENV === 'production') {
        console.error('[Critical Production Error] OpenAI API credentials missing. Rejecting shadowing evaluation request.');
        return NextResponse.json({ error: 'Speech recognition engine is currently unavailable.' }, { status: 500 });
      }

      // Mock only permitted in local DEVELOPMENT / STAGING
      console.warn('[Mock Mode] OPENAI_API_KEY is missing. Operating in fallback mock speech recognition mode.');
      isMocked = true;
      const words = targetText.split(' ');
      if (words.length > 2) {
        words[Math.floor(words.length / 2)] = "walk"; // Simulate warning match
      }
      transcribedText = words.join(' ');
    }

    // 6. Run Alignment & Match Evaluation Algorithm
    const evaluation = alignAndEvaluate(targetText, transcribedText);

    // Fix Blocker #3: Securely record the real shadowing attempt score in database (no more fake stats!)
    try {
      const supabaseAdmin = createSupabaseServiceClient();
      await supabaseAdmin
        .from('shadowing_attempts')
        .insert({
          user_id: user.id,
          track_id: trackId,
          score: evaluation.score
        });
      console.log(`[Shadowing API] Securely recorded score ${evaluation.score} for user UUID: ${user.id.substring(0, 8)}...`);
    } catch (dbErr) {
      console.error('[Shadowing API Database Error] Failed to persist score:', dbErr);
    }

    // 7. Return Structured Output to Frontend with rate limit headers
    const responseHeaders = new Headers({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString()
    });

    return NextResponse.json({
      success: true,
      data: {
        transcript: transcribedText,
        target: targetText,
        evaluation: {
          score: evaluation.score,
          words: evaluation.words,
        },
        storageUrl: uploadData?.path || null,
        is_mocked: isMocked
      }
    }, { 
      status: 200,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error('Shadowing speech analysis routing exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
