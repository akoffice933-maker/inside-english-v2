import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient, createSupabaseRouteClient } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';
import { fetchWithTimeout } from '@/lib/fetch-utils';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * POST /api/ai/audio/generate
 * 
 * Secure AI Text-To-Speech (TTS) Generation & Supabase Storage Upload Pipeline.
 * 
 * Access: Restricted to Premium Users only in production (Vulnerability Fix #2).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting: max 5 generations per minute per IP
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_audio_gen_${ip}`, 5, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы генерируете аудио слишком часто. Пожалуйста, подождите.' }, { status: 429 });
    }

    const { text, voice = 'nova', filename } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Отсутствует обязательный параметр \"text\".' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // 2. Strict Premium Gate check
    const supabase = createSupabaseRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle();

    const isPremiumUser = userProfile?.settings?.is_premium === true;
    if (!isPremiumUser && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Премиум-подписка обязательна для генерации персонального аудио.' }, { status: 402 });
    }

    if (!OPENAI_API_KEY) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'ИИ-сервис генерации аудио временно недоступен.' }, { status: 503 });
      }

      // Mock Fallback for local development/staging
      console.warn('[AI Audio Gen] Missing OpenAI key. Returning mock storage path.');
      return NextResponse.json({
        success: true,
        audio_url: 'free/a1/morning_sun.mp3',
        is_mocked: true
      }, { status: 200 });
    }

    // 3. Request OpenAI TTS (Text-to-Speech) API under a strict 15s timeout
    console.log(`[AI Audio Gen] Synthesizing speech via OpenAI TTS (Voice: ${voice})...`);
    
    const ttsResponse = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1', // Nova & Shimmer are highly optimized for tts-1
        input: text,
        voice: voice, // nova, shimmer, alloy, onyx, fabled, echo
        response_format: 'mp3',
        speed: 1.0
      })
    }, 15000); // 15s timeout guard prevents hanging serverless functions

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error('[AI Audio Gen] OpenAI TTS failed:', errText);
      return NextResponse.json({ error: 'Ошибка синтеза речи ИИ.' }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // 4. Upload synthesized MP3 directly to Supabase Private Bucket 'audio-tracks'
    const targetFilename = filename || `generated_${user.id}_${Date.now()}.mp3`;
    const storagePath = `generated/${user.id}/${targetFilename}`;

    console.log(`[AI Audio Gen] Uploading synthesized MP3 to storage path: "${storagePath}"`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('audio-tracks')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000', // Cache aggressively forever
        upsert: true
      });

    if (uploadError) {
      console.error('[AI Audio Gen Error] Supabase storage upload failed:', uploadError.message);
      return NextResponse.json({ error: 'Ошибка сохранения аудиофайла.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audio_url: uploadData.path, // Will be parsed via createSignedUrl inside client routes
      filename: targetFilename
    }, { status: 200 });

  } catch (err: any) {
    console.error('AI Audio Generation global exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
