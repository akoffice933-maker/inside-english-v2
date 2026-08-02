import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';
import { fetchWithTimeout } from '@/lib/fetch-utils';
import { resolveUserFromRequest } from '@/lib/auth-helpers';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * POST /api/ai/audio/generate
 * 
 * Secure AI Text-To-Speech (TTS) Generation & Supabase Storage Upload Pipeline.
 * 
 * Access: Restricted to Premium Users only in production.
 * Fixes: Uses unified resolveUserFromRequest to support both TMA (telegramId) and Cookie Auth.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting: max 5 generations per minute per IP
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_audio_gen_${ip}`, 5, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы генерируете аудио слишком часто. Пожалуйста, подождите.' }, { status: 429 });
    }

    const { text, voice = 'nova', filename, telegramId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Отсутствует обязательный параметр "text".' }, { status: 400 });
    }

    // 2. Strict Premium Gate check using unified auth helper (Fixes Blocker #2!)
    const userProfile = await resolveUserFromRequest(request, telegramId);

    if (!userProfile) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const isPremiumUser = userProfile.settings?.is_premium === true;
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
        model: 'tts-1',
        input: text,
        voice: voice,
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
    const supabaseAdmin = createSupabaseServiceClient();
    const targetFilename = filename || `generated_${userProfile.id}_${Date.now()}.mp3`;
    const storagePath = `generated/${userProfile.id}/${targetFilename}`;

    console.log(`[AI Audio Gen] Uploading synthesized MP3 to storage path: "${storagePath}"`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('audio-tracks')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: true
      });

    if (uploadError) {
      console.error('[AI Audio Gen Error] Supabase storage upload failed:', uploadError.message);
      return NextResponse.json({ error: 'Ошибка сохранения аудиофайла.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audio_url: uploadData.path,
      filename: targetFilename
    }, { status: 200 });

  } catch (err: any) {
    console.error('AI Audio Generation global exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
