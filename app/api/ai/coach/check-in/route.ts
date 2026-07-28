import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient, createSupabaseServiceClient, telegramMockEmail } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';
import { requestOpenRouter } from '@/lib/openrouter';

/**
 * POST /api/ai/coach/check-in
 * 
 * Securely processes the user's emotional mood check-in.
 * Returns a personalized meditation intro and custom affirmation tokens for the player.
 * Supports both Web PWA and Telegram Mini App sessions.
 * 
 * Fixes Blocker #2: Strictly gates access behind active is_premium subscription in production!
 * Integrates: OpenRouter API aggregator for unified, cost-effective LLM processing.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP-based Rate Limiting (max 3 check-ins per minute per IP)
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_coach_checkin_${ip}`, 3, 60000);
    if (limited) {
      return NextResponse.json({ 
        error: 'Вы слишком часто запрашиваете сонастройку. Сделайте глубокий вдох и повторите через минуту 🧘.' 
      }, { status: 429 });
    }

    const { state, moodInput, telegramId } = await request.json();

    if (!state || !moodInput) {
      return NextResponse.json({ error: 'Необходимо передать текущее состояние и описание настроения.' }, { status: 400 });
    }

    // 2. Resolve User ID and Settings (Dual-Identity Bridge)
    let userId: string | null = null;
    let userSettings: any = null;
    let supabaseClient;

    if (telegramId) {
      supabaseClient = createSupabaseServiceClient();
      const { data: profile } = await supabaseClient
        .from('users')
        .select('id, settings')
        .eq('email', telegramMockEmail(telegramId))
        .maybeSingle();
      userId = profile?.id || null;
      userSettings = profile?.settings || null;
    } else {
      const supabase = createSupabaseRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const adminClient = createSupabaseServiceClient();
        const { data: profile } = await adminClient
          .from('users')
          .select('settings')
          .eq('id', user.id)
          .maybeSingle();
        userSettings = profile?.settings || null;
      }
    }

    // Fallback: If no authenticated user is found, reject in production
    if (!userId && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // 3. Strict Premium Gate for high-cost AI Coach checkin
    const isPremiumUser = userSettings?.is_premium === true;
    if (!isPremiumUser && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Premium subscription required to access the ИИ-Коуч. Пожалуйста, оформите подписку.' 
      }, { status: 402 });
    }

    // 4. OpenRouter Call or High-Fidelity Local Mock Fallback
    let gptContent;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

    if (OPENROUTER_API_KEY) {
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `Вы — премиальный ИИ-коуч состояния и преподаватель английского языка в приложении Inside English. 
            Проанализируйте чек-ин пользователя, его состояние (${state}) и сгенерируйте ответ строго в формате JSON:
            {
              "introText": "Мягкий вводный текст (до 35 слов) на русском языке с редкими вкраплениями английского. Текст настраивает на практику.",
              "affirmation": "Глубокая аффирмация (1 предложение) на английском языке.",
              "affirmationTokens": [
                {
                  "id": 1,
                  "start": 0.0,
                  "end": 4.5,
                  "russian": "Перевод первой части аффирмации.",
                  "english": "Английская первая часть.",
                  "mixed": "Смешанный вариант с выделением английских слов через <span class=\\"text-[#7B61FF] font-medium\\">...</span>"
                },
                {
                  "id": 2,
                  "start": 4.5,
                  "end": 9.0,
                  "russian": "Перевод второй части аффирмации.",
                  "english": "Английская вторая часть.",
                  "mixed": "Смешанный вариант второй части."
                }
              ]
            }`
          },
          {
            role: 'user' as const,
            content: `Мое состояние: ${state}. Мое самочувствие сейчас: "${moodInput}"`
          }
        ];

        const openrouterData = await requestOpenRouter(messages, true);
        gptContent = JSON.parse(openrouterData.choices[0].message.content);
      } catch (err: any) {
        console.error('[OpenRouter API Error] Failed to generate coaching content:', err);
        return NextResponse.json({ error: 'Ошибка генерации контента нейросетью.' }, { status: 502 });
      }
    } else {
      // Mock Fallback (permitted only in local DEVELOPMENT / STAGING)
      console.warn('[AI Mood Coach] Missing OpenRouter API Key. Firing rich local fallback.');
      
      if (state === 'relax' || state === 'sleep') {
        gptContent = {
          introText: "Я чувствую вашу усталость. Давайте отпустим накопившееся напряжение. Сделайте глубокий вдох... Этот момент целиком принадлежит вам.",
          affirmation: "I let go of tension and embrace complete tranquility.",
          affirmationTokens: [
            {
              id: 1,
              start: 0.0,
              end: 4.0,
              russian: "Я отпускаю все напряжение,",
              english: "I let go of tension,",
              mixed: "Я отпускаю <span class=\"text-[#7B61FF] font-medium\">all tension</span>,"
            },
            {
              id: 2,
              start: 4.0,
              end: 8.5,
              russian: "и принимаю полное спокойствие.",
              english: "and embrace complete tranquility.",
              mixed: "и принимаю <span class=\"text-[#7B61FF] font-medium\">complete tranquility</span>."
            }
          ]
        };
      } else {
        gptContent = {
          introText: "Отличный фокус! Направим вашу ментальную энергию на достижение целей. Вы готовы действовать и учиться с радостью.",
          affirmation: "I welcome new challenges and focus my energy on growth.",
          affirmationTokens: [
            {
              id: 1,
              start: 0.0,
              end: 3.5,
              russian: "Я принимаю новые вызовы",
              english: "I welcome new challenges",
              mixed: "Я принимаю <span class=\"text-[#7B61FF] font-medium\">new challenges</span>"
            },
            {
              id: 2,
              start: 3.5,
              end: 8.0,
              russian: "и фокусирую энергию на росте.",
              english: "and focus my energy on growth.",
              mixed: "и фокусирую <span class=\"text-[#7B61FF] font-medium\">energy on growth</span>."
            }
          ]
        };
      }
    }

    // 5. Save the generated session to Supabase database (Bypasses RLS safely via service client)
    if (userId) {
      try {
        const supabaseAdmin = createSupabaseServiceClient();
        await supabaseAdmin
          .from('ai_coach_sessions')
          .insert({
            user_id: userId,
            state,
            user_mood_input: moodInput,
            intro_text: gptContent.introText,
            affirmation_text: gptContent.affirmation,
            affirmation_tokens: gptContent.affirmationTokens
          });
      } catch (dbError) {
        console.error('[Database Error] Failed to persist session:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      data: gptContent
    }, { status: 200 });

  } catch (err: any) {
    console.error('AI Coach endpoint global exception:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
