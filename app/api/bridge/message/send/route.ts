import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';
import { requestOpenRouter } from '@/lib/openrouter';
import { resolveUserFromRequest } from '@/lib/auth-helpers';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

/**
 * POST /api/bridge/message/send
 * 
 * Securely processes a conversational message within the Inside Bridge (Flow Talk) ecosystem.
 * Evaluates literal meaning, speaker's emotional intent, and generates 3 custom response paths
 * based on the active session's emotional state (relax/energy).
 * 
 * Fixes Blocker #2: Strictly gates access behind active is_premium subscription in production!
 * Integrates: OpenRouter API aggregator for unified, cost-effective LLM processing.
 * Fixes: Uses unified resolveUserFromRequest to support both TMA (telegramId) and Cookie Auth.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP-based Rate Limiting (max 15 messages per minute)
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_bridge_send_${ip}`, 15, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы отправляете реплики слишком быстро. Сделайте паузу 🧘.' }, { status: 429 });
    }

    const { sessionId, text, languageCode, telegramId } = await request.json();

    if (!sessionId || !text || !languageCode) {
      return NextResponse.json({ error: 'Неполные параметры запроса.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // 2. Query session state
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bridge_sessions')
      .select('state, creator_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Сессия диалога не найдена.' }, { status: 404 });
    }

    // 3. Fix Blocker #2: Strict Premium Gate check using unified auth helper (Vulnerability Fix!)
    const userProfile = await resolveUserFromRequest(request, telegramId || session.creator_id);

    const isPremiumUser = userProfile?.settings?.is_premium === true;
    if (!isPremiumUser && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Premium subscription required to use Inside Bridge translation.' 
      }, { status: 402 });
    }

    // 4. Request OpenRouter with strict JSON structured output
    if (!OPENROUTER_API_KEY) {
      // Mock Fallback for local development or static demo previewing (prevents crashing when API keys are absent)
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'ИИ-посредник временно отключен.' }, { status: 503 });
      }

      console.warn('[Inside Bridge] Missing OpenRouter API Key. Operating in mock fallback conversational mode.');
      
      const isEnglish = languageCode.toLowerCase() === 'en';
      const mockPayload = {
        literalTranslation: isEnglish 
          ? "Я не уверен, смогу ли я прийти завтра, возможно, в другой день..." 
          : "I am not sure if I can make it tomorrow, maybe some other day...",
        intent: "Вежливый отказ / Перенос встречи",
        emotion: "Неуверенность / Вежливость",
        suggestedReplies: [
          {
            id: 1,
            text: session.state === 'relax' 
              ? "No problem, we can reschedule." 
              : "Let's reschedule. What about Thursday?",
            type: "answer",
            description: "Вежливо принять отмену и предложить перенести на другой день."
          },
          {
            id: 2,
            text: "Is everything okay?",
            type: "question",
            description: "Проявить заботу и поинтересоваться, всё ли в порядке."
          },
          {
            id: 3,
            text: "Would next week work better?",
            type: "question",
            description: "Предложить альтернативный вариант на следующей неделе."
          }
        ]
      };

      return NextResponse.json({
        success: true,
        data: mockPayload,
        is_mocked: true
      }, { status: 200 });
    }

    console.log(`[Inside Bridge] Evaluating message for session ${sessionId}. Language: ${languageCode}`);

    const messages = [
      {
        role: 'system' as const,
        content: `Вы — умный голосовой ИИ-посредник Inside Bridge. Проанализируйте реплику в контексте состояния сессии (${session.state}).
        Верните строго JSON-объект:
        {
          "literalTranslation": "Перевод реплики на противоположный язык (RU <-> EN).",
          "intent": "Краткое намерение говорящего (например: Мягкий отказ, Уточнение).",
          "emotion": "Эмоциональный тон (например: Неуверенность, Спокойствие, Спешка).",
          "suggestedReplies": [
            { "id": 1, "text": "Вариант ответа 1.", "type": "answer", "description": "Пояснение." },
            { "id": 2, "text": "Вариант ответа 2.", "type": "question", "description": "Пояснение." },
            { "id": 3, "text": "Вариант ответа 3.", "type": "topic_change", "description": "Пояснение." }
          ]
        }`
      },
      {
        role: 'user' as const,
        content: `Исходная реплика (${languageCode}): "${text}"`
      }
    ];

    try {
      const openrouterData = await requestOpenRouter(messages, true);
      const parsedPayload = JSON.parse(openrouterData.choices[0].message.content);

      // 5. Record the message and AI metadata into the Supabase database
      const { error: messageInsertError } = await supabaseAdmin
        .from('bridge_messages')
        .insert({
          session_id: sessionId,
          original_text: text,
          language_code: languageCode,
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
        data: parsedPayload
      }, { status: 200 });
    } catch (openrouterErr: any) {
      console.error('[OpenRouter API Error] Failed to generate semantic analysis:', openrouterErr);
      return NextResponse.json({ error: 'Ошибка генерации контента нейросетью.' }, { status: 502 });
    }

  } catch (err: any) {
    console.error('Inside Bridge Route error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
