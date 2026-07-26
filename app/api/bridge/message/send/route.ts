import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient, telegramMockEmail } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * POST /api/bridge/message/send
 * 
 * Securely processes a conversational message within the Inside Bridge (Flow Talk) ecosystem.
 * Evaluates literal meaning, speaker's emotional intent, and generates 3 custom response paths
 * based on the active session's emotional state (relax/energy).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP-based Rate Limiting (max 15 messages per minute)
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_bridge_send_${ip}`, 15, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы отправляете реплики слишком быстро. Сделайте паузу 🧘.' }, { status: 429 });
    }

    const { sessionId, text, languageCode } = await request.json();

    if (!sessionId || !text || !languageCode) {
      return NextResponse.json({ error: 'Неполные параметры запроса.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // 2. Query session state and variables
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bridge_sessions')
      .select('state, creator_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Сессия диалога не найдена.' }, { status: 404 });
    }

    // 3. Request OpenAI GPT-4o with strict JSON structured output
    if (!OPENAI_API_KEY) {
      // Mock Fallback for local development or static demo previewing (prevents crashing when API keys are absent)
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'ИИ-посредник временно отключен.' }, { status: 503 });
      }

      console.warn('[Inside Bridge] Missing OpenAI API Key. Operating in mock fallback conversational mode.');
      
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

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
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
            role: 'user',
            content: `Исходная реплика (${languageCode}): "${text}"`
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI responded with error');
    }

    const openaiData = await openaiResponse.json();
    const parsedPayload = JSON.parse(openaiData.choices[0].message.content);

    // 4. Record the message and AI metadata into the Supabase database
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

  } catch (err: any) {
    console.error('Inside Bridge Route error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
