import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';
import { requestOpenRouter } from '@/lib/openrouter';
import { resolveUserFromRequest } from '@/lib/auth-helpers';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * POST /api/bridge/voice/process
 * 
 * Production-ready in-memory Voice Processing Pipeline for Inside Bridge (Flow Talk) MVP.
 * Integrates: OpenRouter API aggregator for unified, cost-effective LLM processing.
 * Fixes: Uses unified resolveUserFromRequest to support both TMA (telegramId) and Cookie Auth.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP-based Rate Limiting (max 15 voice chunks per minute)
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_bridge_voice_${ip}`, 15, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы отправляете аудиозаписи слишком быстро. Сделайте паузу.' }, { status: 429 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    const telegramId = formData.get('telegramId') as string | null;

    if (!audioFile || !sessionId) {
      return NextResponse.json({ error: 'Неполные параметры запроса. Ожидается "audio" и "sessionId".' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // 2. Fetch active session metadata & check premium status (Fix Blocker #2)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bridge_sessions')
      .select('state, creator_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Сессия диалога не найдена.' }, { status: 404 });
    }

    // Fetch user settings securely via unified auth helper (Fixes Blocker #2!)
    const userProfile = await resolveUserFromRequest(request, telegramId || session.creator_id);

    const isPremiumUser = userProfile?.settings?.is_premium === true;
    if (!isPremiumUser && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Premium subscription required to access Inside Bridge voice translation. Пожалуйста, оформите подписку.' 
      }, { status: 402 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const fileExtension = audioFile.name.split('.').pop() || 'webm';

    // 3. STEP A: Whisper Speech-to-Text Transcription
    if (!OPENAI_API_KEY) {
      // Mock Fallback for local development or static demo previewing (prevents crashing when API keys are absent)
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'ИИ-посредник временно отключен.' }, { status: 503 });
      }

      console.warn('[Inside Bridge Voice] Missing OpenAI API Key. Operating in mock fallback mode.');
      
      const mockPayload = {
        transcript: "Hi, I am calling about my reservation for tomorrow night.",
        literalTranslation: "Привет, я звоню по поводу моего бронирования на завтрашний вечер.",
        intent: "Запрос информации / Подтверждение брони",
        emotion: "Спокойный / Деловой",
        suggestedReplies: [
          {
            id: 1,
            text: "Hello! Yes, let me check that for you.",
            type: "answer",
            description: "Вежливо поприветствовать и предложить проверить бронь."
          },
          {
            id: 2,
            text: "Could you please tell me your name?",
            type: "question",
            description: "Спросить имя, на которое оформлено бронирование."
          },
          {
            id: 3,
            text: "Understood. Give me just a second.",
            type: "answer",
            description: "Дать понять, что вы занимаетесь запросом."
          }
        ]
      };

      return NextResponse.json({
        success: true,
        data: mockPayload,
        is_mocked: true
      }, { status: 200 });
    }

    console.log(`[Inside Bridge Voice] Transcribing ${audioFile.size} bytes audio chunk...`);
    
    const whisperFormData = new FormData();
    const audioBlob = new Blob([buffer], { type: audioFile.type });
    whisperFormData.append('file', audioBlob, `bridge_audio.${fileExtension}`);
    whisperFormData.append('model', 'whisper-1');
    
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: whisperFormData
    });

    if (!whisperResponse.ok) {
      const errDetails = await whisperResponse.text();
      console.error('[Inside Bridge Voice] Whisper transcription failed:', errDetails);
      return NextResponse.json({ error: 'Ошибка распознавания речи.' }, { status: 502 });
    }

    const whisperData = await whisperResponse.json();
    const transcribedText = whisperData.text || '';

    if (!transcribedText.trim()) {
      return NextResponse.json({ 
        success: true, 
        message: "No speech detected in audio chunk.", 
        data: null 
      }, { status: 200 });
    }

    console.log(`[Inside Bridge Voice] Recognized speech: "${transcribedText}"`);

    // 4. STEP B: OpenRouter Semantic Interpretation & "Quiet Hints" Generation
    const messages = [
      {
        role: 'system' as const,
        content: `Вы — умный голосовой ИИ-посредник Inside Bridge. Проанализируйте реплику в контексте состояния сессии (${session.state}).
        Сгенерируйте 3 ультра-коротких «тихих подсказки» (до одной строки каждая) для быстрого считывания боковым зрением во время звонка.
        Верните строго JSON-объект:
        {
          "literalTranslation": "Перевод реплики на противоположный язык (RU <-> EN).",
          "intent": "Краткое намерение говорящего (например: Запрос брони, Согласие, Отказ).",
          "emotion": "Эмоциональный тон (например: Спокойствие, Спешка, Смущение).",
          "suggestedReplies": [
            { "id": 1, "text": "Вариант ответа 1.", "type": "answer", "description": "Пояснение." },
            { "id": 2, "text": "Вариант ответа 2.", "type": "question", "description": "Пояснение." },
            { "id": 3, "text": "Вариант ответа 3.", "type": "topic_change", "description": "Пояснение." }
          ]
        }`
      },
      {
        role: 'user' as const,
        content: `Распознанная речь: "${transcribedText}"`
      }
    ];

    try {
      const openrouterData = await requestOpenRouter(messages, true);
      const parsedPayload = JSON.parse(openrouterData.choices[0].message.content);

      // 5. STEP C: Persist message details (Bypasses RLS via service client)
      const { error: messageInsertError } = await supabaseAdmin
        .from('bridge_messages')
        .insert({
          session_id: sessionId,
          original_text: transcribedText,
          language_code: 'auto', // Detected dynamically
          literal_translation: parsedPayload.literalTranslation,
          intent: parsedPayload.intent,
          emotion: parsedPayload.emotion,
          suggested_replies: parsedPayload.suggestedReplies
        });

      if (messageInsertError) {
        console.error('[Database Error] Failed to record bridge message:', messageInsertError);
      }

      return NextResponse.json({
        success: true,
        data: {
          transcript: transcribedText,
          ...parsedPayload
        }
      }, { status: 200 });

    } catch (openrouterErr: any) {
      console.error('[OpenRouter API Error] Failed to generate semantic analysis:', openrouterErr);
      return NextResponse.json({ error: 'Ошибка генерации контента нейросетью.' }, { status: 502 });
    }

  } catch (err: any) {
    console.error('Inside Bridge Voice processing global exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
