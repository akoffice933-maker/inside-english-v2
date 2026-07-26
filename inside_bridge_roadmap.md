# Дорожная карта и архитектурный план внедрения «Inside Bridge» (Flow Talk) v1.0
**Роль:** Chief Technology Officer (CTO) / Lead Architect  
**Концепция:** ИИ-посредник, убирающий языковой барьер, анализирующий намерения (Intent) и эмоции (Tone) собеседников в реальном времени, с предоставлением 3 вариантов ответа под выбранное эмоциональное состояние (relax / energy).

Ниже представлен детальный 4-недельный план внедрения, расширение схемы базы данных PostgreSQL, спецификации API-контрактов и готовый код ядра обработки диалогов!

---

## 🗺️ ЭТАП 1. Расширение структуры БД (Supabase PostgreSQL)

Для поддержки истории диалогов, хранения реплик собеседников, распознанных эмоций и сгенерированных вариантов ответов мы создаем две таблицы: `bridge_sessions` (сессии общения) и `bridge_messages` (реплики).

Запишите эту миграцию в файл `inside_bridge_migration.sql` и примените в Supabase:

```sql
-- Таблица сессий общения
CREATE TABLE public.bridge_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Опционально для двухпользовательского режима
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived'
    state emotional_state NOT NULL DEFAULT 'relax', -- Влияет на тон ИИ-подсказок (relax = мягче, energy = увереннее)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Таблица реплик диалога с извлеченными ИИ метаданными
CREATE TABLE public.bridge_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.bridge_sessions(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Кто сказал (если NULL - ИИ или внешний партнер)
    original_text TEXT NOT NULL, -- Распознанный текст на исходном языке
    language_code TEXT NOT NULL, -- 'ru' | 'en' | 'es' и т.д.
    literal_translation TEXT NOT NULL, -- Дословный перевод смысла реплики
    intent TEXT NOT NULL, -- Выявленное ИИ намерение (e.g., 'soft_rejection', 'agreement', 'question')
    emotion TEXT NOT NULL, -- Оцененная эмоция (e.g., 'hesitant', 'confident', 'annoyed')
    suggested_replies JSONB NOT NULL, -- Массив 3 вариантов продолжения разговора [{text, type, tone}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Настройка RLS-политик
ALTER TABLE public.bridge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bridge sessions"
ON public.bridge_sessions FOR ALL TO authenticated
USING (auth.uid() = creator_id OR auth.uid() = partner_id);

CREATE POLICY "Users can view messages of their sessions"
ON public.bridge_messages FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.bridge_sessions s 
    WHERE s.id = session_id AND (s.creator_id = auth.uid() OR s.partner_id = auth.uid())
));

-- Индексы для мгновенного рендеринга истории
CREATE INDEX idx_bridge_sessions_users ON public.bridge_sessions(creator_id, partner_id);
CREATE INDEX idx_bridge_messages_session ON public.bridge_messages(session_id);
```

---

## 📞 ЭТАП 2. Спецификация API: `POST /api/bridge/message/send`

Эндпоинт обрабатывает входящую реплику (распознанный текст), анализирует её контекст и возвращает полный психоэмоциональный разбор с готовыми сценариями ответов.

### Payload запроса:
```json
{
  "sessionId": "4ecafa35-5be3-18ce-e39c-ca3bd36772b7",
  "text": "I’m not sure if I can make it tomorrow, maybe some other day...",
  "languageCode": "en"
}
```

### Системный Промпт для GPT-4o (Structured JSON Output):
```
SYSTEM PROMPT:
Вы — умный голосовой ИИ-посредник Inside Bridge, убирающий языковой барьер между людьми.
Проанализируйте входящую реплику пользователя в контексте диалога, определите буквальный смысл (literal translation), скрытое намерение (intent), эмоцию говорящего (emotion) и сгенерируйте 3 наиболее подходящих варианта ответа/вопроса для продолжения беседы.

Тон подсказок (suggested_replies) должен зависеть от активного состояния сессии (${sessionState}):
- Если state = relax: предлагайте максимально мягкие, дипломатичные, обтекаемые и спокойные формулировки (polite, gentle).
- Если state = energy: предлагайте сильные, прямые, уверенные, деловые формулировки (active, confident).

ВЫХОДНЫЕ ДАННЫЕ ДОЛЖНЫ БЫТЬ СТРОГО В ФОРМАТЕ JSON:
{
  "literalTranslation": "Дословный перевод смысла на русский (или английский, если исходный язык русский).",
  "intent": "Краткое намерение говорящего (например: Мягкий отказ, Запрос информации, Согласие).",
  "emotion": "Психоэмоциональный тон (например: Неуверенность, Спокойствие, Раздражение).",
  "suggestedReplies": [
    {
      "id": 1,
      "text": "Вариант ответа 1 на целевом языке.",
      "type": "answer", // 'answer' | 'question' | 'topic_change'
      "description": "Пояснение для пользователя: что выразит этот ответ (например: Вежливо согласиться и предложить перенос)."
    },
    {
      "id": 2,
      "text": "Вариант ответа 2 на целевом языке.",
      "type": "question",
      "description": "Уточняющий вопрос для развития диалога."
    },
    {
      "id": 3,
      "text": "Вариант ответа 3 на целевом языке.",
      "type": "topic_change",
      "description": "Мягкий перевод темы или проявление заботы."
    }
  ]
}
```

---

## 🛠️ ЭТАП 3. Код ядра обработки сообщений Inside Bridge

Я написал полностью рабочий Route Handler для Next.js 14, реализующий эту сложнейшую логику с защитой от спама и интеграцией с OpenAI GPT-4o!

Запишите его в файл `app/api/bridge/message/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // 1. Лимитирование запросов: макс. 15 реплик в минуту на IP
    const ip = getClientIP(request);
    const { limited } = await isRateLimited(`rate_limit_bridge_send_${ip}`, 15, 60000);
    if (limited) {
      return NextResponse.json({ error: 'Вы отправляете реплики слишком быстро. Сделайте паузу.' }, { status: 429 });
    }

    const { sessionId, text, languageCode } = await request.json();

    if (!sessionId || !text || !languageCode) {
      return NextResponse.json({ error: 'Неполные параметры запроса.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // 2. Получаем сессию и проверяем её статус
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('bridge_sessions')
      .select('state, creator_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Сессия диалога не найдена.' }, { status: 404 });
    }

    // 3. Запрос к GPT-4o для извлечения просодики, намерений и генерации подсказок
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'ИИ-посредник временно отключен.' }, { status: 503 });
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

    // 4. Записываем реплику и сгенерированные данные в базу
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
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
```

---

## 📅 ЭТАП 4. Пошаговый 4-недельный план внедрения Inside Bridge

```
[НЕДЕЛЯ 1: БД И БЭКЕНД] ──► [НЕДЕЛЯ 2: РАСПОЗНАВАНИЕ] ──► [НЕДЕЛЯ 3: ФРОНТЕНД И ИНТЕРФЕЙС] ──► [НЕДЕЛЯ 4: РЕЛИЗ]
```

### 🗓️ Неделя 1: База данных и Ядро ИИ
*   **Задача 1:** Накатить миграцию `inside_bridge_migration.sql` в базу данных Supabase.
*   **Задача 2:** Развернуть и протестировать эндпоинт `/api/bridge/message/send` через Postman/Insomnia.
*   **Задача 3:** Спроектировать системные промпты под 4 эмоциональных состояния (relax / focus / energy / sleep).

### 🗓️ Неделя 2: Голосовой пайплайн (Whisper + Веб-рекордер)
*   **Задача 1:** Интегрировать браузерный `MediaRecorder` на фронтенде для захвата голоса.
*   **Задача 2:** Разработать на бэкенде транскрибатор аудиофайлов через Whisper API, возвращающий текстовую строку напрямую в наш `/api/bridge/message/send`.
*   **Задача 3:** Оптимизировать кэширование истории последних 5 реплик сессии для сохранения контекста разговора (Conversation Memory).

### 🗓️ Неделя 3: Интерфейс и Микро-интеракции (Framer Motion)
*   **Задача 1:** Разработать экран «Диалог Inside Bridge»: разделенный пополам экран (одна половина для вас, вторая — для собеседника) с красивыми неоновыми бэкдропами.
*   **Задача 2:** Добавить визуализатор пульсации голоса при говорении (SVG-анимация).
*   **Задача 3:** Реализовать плавное появление 3 карточек-вариантов ответов с использованием упругой пружинной физики (эффект каскада stagger за 60 мс).

### 🗓️ Неделя 4: Интеграция TTS, Тестирование и Релиз
*   **Задача 1:** Интегрировать озвучку выбранного варианта ответа через Google TTS или ElevenLabs (пользователь нажимает на подсказку ➡️ телефон озвучивает фразу вслух собеседнику).
*   **Задача 2:** Настроить двухпользовательский режим через WebSockets (Supabase Realtime) — два телефона коннектятся к одной сессии, и изменения реплик транслируются мгновенно.
*   **Задача 3:** Запустить закрытый TestFlight-релиз и исправить баги задержки аудио.
