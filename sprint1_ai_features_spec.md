# ТЗ: Интеграция AI-функций (Спринт 1): «Персональный AI-Коуч» и «Adaptive Shadowing 2.0»
**Стек интеграции:** Next.js 14 Route Handlers, Supabase (PostgreSQL), OpenAI API (GPT-4o / Whisper v1).  

Внедрение данных фич переводит Inside English v2.0 из категории «сервиса для чтения» в лигу **высокотехнологичных ультра-премиальных продуктов**, предоставляющих гипер-персонализированный опыт на стыке EdTech и Mindfulness.

---

## ЧАСТЬ 1. Персональный AI-Коуч состояния (AI Mood Coach)

### 1.1. Бизнес-логика и User Flow
1.  Пользователь открывает дашборд и выбирает текущее эмоциональное состояние (🧘 `relax`, ⚡ `energy`, 🌙 `sleep`).
2.  Вместо запуска статичного трека открывается форма быстрого **голосового или текстового чек-ина**: *«Опишите в паре слов, как проходит ваш день и что вы чувствуете прямо сейчас?»*.
3.  Фронтенд отправляет `initData` чекина на сервер.
4.  ИИ генерирует:
    *   **Персонализированную утреннюю/вечернюю аффирмацию (Daily Affirmation)** на английском языке, идеально соответствующую текущей эмоции пользователя, с готовой смешанной (RU-EN) разметкой токенов.
    *   **Персональный Intro-сценарий (Вводную медитацию):** мягкий текстовый сценарий, который дикторский плеер зачитает (или синтезирует через TTS) перед началом основного урока для сонастройки ума.

---

### 1.2. Структура базы данных (SQL Миграция)
Для хранения сессий чекина и сгенерированных аффирмаций добавляем таблицу в Supabase:

```sql
-- Таблица сессий AI-коучинга для отслеживания ментального прогресса
CREATE TABLE public.ai_coach_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    state emotional_state NOT NULL,
    user_mood_input TEXT NOT NULL, -- Что пользователь ввел/наговорил при чекине
    intro_text TEXT NOT NULL, -- Сгенерированная медитативная вводная
    affirmation_text TEXT NOT NULL, -- Текст аффирмации (EN)
    affirmation_tokens JSONB NOT NULL, -- Пословная разметка аффирмации с переводами для плеера
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Включение RLS
ALTER TABLE public.ai_coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own coaching sessions"
ON public.ai_coach_sessions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_coach_sessions_user ON public.ai_coach_sessions(user_id);
```

---

### 1.3. Спецификация API Эндпоинта: `POST /api/ai/coach/check-in`

#### Payload запроса:
```json
{
  "state": "relax",
  "moodInput": "Очень устал на работе, голова гудит от звонков, хочется переключиться и расслабиться перед сном."
}
```

#### Системный Промпт для GPT-4o (с гарантией Structured Output):
Используется режим **`response_format: { type: "json_object" }`** для получения гарантированно валидной структуры.

```
SYSTEM PROMPT:
Вы — премиальный ИИ-коуч состояния и преподаватель английского языка в приложении Inside English. 
Ваша задача — проанализировать эмоциональный чек-ин пользователя, его текущее состояние (state: relax/energy/sleep) и сгенерировать персонализированный контент на английском языке для медитативной языковой сонастройки.

ВЫХОДНЫЕ ДАННЫЕ ДОЛЖНЫ БЫТЬ СТРОГО В ФОРМАТЕ JSON СО СЛЕДУЮЩЕЙ СТРУКТУРОЙ:
{
  "introText": "Мягкий успокаивающий или заряжающий вводный текст (до 30-40 слов) на русском языке с редкими вкраплениями английского. Текст готовит к практике.",
  "affirmation": "Сильная, глубокая аффирмация (1 предложение) на английском языке, бьющая точно в запрос пользователя.",
  "affirmationTokens": [
    {
      "id": 1,
      "start": 0,
      "end": 3.5,
      "russian": "Перевод части аффирмации на русский.",
      "english": "Оригинальная английская часть.",
      "mixed": "Смешанный русско-английский вариант, где английское ключевое слово/фраза обернуто в тег <span class=\"text-[#7B61FF] font-medium\">английское_слово</span>."
    }
  ]
}

ПРАВИЛА ГЕНЕРАЦИИ:
1. Тон: Ультра-эмпатичный, поддерживающий, люксовый. Никаких шаблонных фраз.
2. Для состояния relax/sleep — используйте мягкий, убаюкивающий гипнотический язык.
3. Для состояния energy — используйте сильные глаголы действия, мотивационный и вдохновляющий тон.
4. Разметка tokens должна идеально подходить под наш плеер. Рассчитайте примерные таймкоды start и end в массиве affirmationTokens исходя из скорости чтения 120 слов в минуту.
```

---

## ЧАСТЬ 2. Adaptive Shadowing 2.0 (Анализ Просодики и Эмоций)

### 2.1. Бизнес-логика
В классическом shadowing мы просто распознаем слова через Whisper. В **Adaptive Shadowing 2.0** мы анализируем **просодику речи**: темп, паузы, интонацию и эмоциональный окрас голоса. ИИ сравнивает аудиозапись пользователя с оригиналом и выдает точечный коучинг-отклик, помогая звучать естественно и осознанно.

---

### 2.2. Спецификация API Эндпоинта: `POST /api/tracks/[id]/shadow/v2`

#### Payload запроса (Form Data):
*   `audio`: бинарный файл записи голоса пользователя (`webm` или `mp4`).
*   `targetText`: эталонный текст английского предложения.
*   `expectedTone`: ожидаемый эмоциональный окрас (`calm` / `energetic` / `soft`).

#### Архитектура обработки на бэкенде:
1.  **Распознавание Whisper:** Извлекает транскрипт текста с флагом `word_timestamps=true` для получения точных таймингов каждого произнесенного пользователем слова.
2.  **Анализ темпа и пауз:** Бэкенд сравнивает длительность пауз (разность `end` предыдущего слова и `start` текущего) в эталонном файле диктора и файле пользователя.
3.  **GPT-4o Audio / Текстовый анализ метрик:** Полученные числовые метрики (темп речи, длительность пауз, пропущенные слова) отправляются в GPT-4o для генерации человечного, точечного фидбека по интонации.

#### Пример ответа API (JSON):
```json
{
  "success": true,
  "data": {
    "score": 88,
    "evaluation": {
      "words": [
        { "word": "Today", "status": "match" },
        { "word": "I", "status": "match" },
        { "word": "woke", "status": "match" },
        { "word": "up", "status": "warn", "issue": "Слишком быстрое произношение" },
        { "word": "early", "status": "match" }
      ],
      "prosody": {
        "tempo": "fast",
        "tempoFeedback": "Вы произнесли фразу на 1.2 секунды быстрее диктора. Попробуйте замедлить темп, особенно на связке 'woke up'. Пусть слова плавно перетекают друг в друга.",
        "intonationScore": 85,
        "intonationFeedback": "Прекрасный мягкий тон! Вы отлично уловили спокойную интонацию утренней практики. Сделайте чуть более глубокий акцент на слове 'early'.",
        "recommendation": "Повторите попытку, сделав осознанную паузу в 0.5 секунды сразу после слова 'Today' 🧘."
      }
    }
  }
}
```

---

## ЧАСТЬ 3. Реализация Next.js API Роута: `POST /api/ai/coach/check-in`

Ниже представлен готовый к деплою, полностью типизированный код Next.js 14 Route Handler, реализующий функционал Персонального Коуча с защитой от спама и интеграцией с Supabase!

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient, createSupabaseServiceClient, telegramMockEmail } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // 1. Защита от спама (Rate Limiting): макс. 3 чекина в минуту на IP
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_coach_checkin_${ip}`, 3, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы слишком часто делаете чек-ин. Сделайте глубокий вдох и повторите через минуту 🧘.' }, { status: 429 });
    }

    const { state, moodInput, telegramId } = await request.json();

    if (!state || !moodInput) {
      return NextResponse.json({ error: 'Необходимо передать текущее состояние и описание настроения.' }, { status: 400 });
    }

    // 2. Авторизация пользователя (Dual-Identity Bridge)
    let userId: string | null = null;
    let supabaseClient;

    if (telegramId) {
      supabaseClient = createSupabaseServiceClient();
      const { data: profile } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', telegramMockEmail(telegramId))
        .maybeSingle();
      userId = profile?.id || null;
    } else {
      const supabase = createSupabaseRouteClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Пользователь не авторизован.' }, { status: 401 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'ИИ-сервис временно недоступен (отсутствует API ключ).' }, { status: 503 });
    }

    // 3. Запрос к OpenAI GPT-4o в режиме Structured Output
    console.log(`[AI Mood Coach] Generating personalized session for user ${userId}. Mood: ${moodInput.substring(0, 30)}...`);

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
            content: `Вы — премиальный ИИ-коуч состояния и преподаватель английского языка в приложении Inside English. 
            Проанализируйте чек-ин пользователя, его состояние (${state}) и сгенерируйте ответ строго в формате JSON:
            {
              "introText": "Мягкий вводный текст (до 35 слов) на русском языке с редкими вкраплениями английского. Текст настраивает на практику.",
              "affirmation": "Глубокая аффирмация (1 предложение) на английском языке.",
              "affirmationTokens": [
                {
                  "id": 1,
                  "start": 0.0,
                  "end": 3.0,
                  "russian": "Перевод части аффирмации.",
                  "english": "Английская часть.",
                  "mixed": "Смешанный вариант с выделением английских слов через <span class=\\"text-[#7B61FF] font-medium\\">...</span>"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Мое состояние: ${state}. Мое самочувствие сейчас: "${moodInput}"`
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('[OpenAI API Error] Failed to generate coaching content:', errText);
      return NextResponse.json({ error: 'Ошибка генерации контента нейросетью.' }, { status: 502 });
    }

    const openaiData = await openaiResponse.json();
    const gptContent = JSON.parse(openaiData.choices[0].message.content);

    // 4. Сохранение сгенерированной сессии в базу данных Supabase
    const supabaseAdmin = createSupabaseServiceClient();
    const { error: dbError } = await supabaseAdmin
      .from('ai_coach_sessions')
      .insert({
        user_id: userId,
        state,
        user_mood_input: moodInput,
        intro_text: gptContent.introText,
        affirmation_text: gptContent.affirmation,
        affirmation_tokens: gptContent.affirmationTokens
      });

    if (dbError) {
      console.error('[Database Error] Failed to persist AI coaching session:', dbError.message);
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
```
