# Интеграция Inside English v2.0 в Telegram Mini Apps (TMA)

Запуск приложения **Inside English** в качестве **Telegram Mini App (TMA)** — это мощнейший виральный канал привлечения пользователей. Свыше 800 миллионов человек пользуются Telegram ежедневно, а запуск веб-приложений прямо внутри чата решает главную проблему мобильного веба: **отсутствие трения при регистрации**.

Пользователю не нужно переходить на сайт, вводить email и подтверждать пароли. Он нажимает кнопку в боте ➡️ приложение открывается мгновенно ➡️ профиль автоматически создается на базе его Telegram-аккаунта.

Ниже представлена пошаговая инструкция по настройке, авторизации и монетизации нашего стека внутри Telegram.

---

## 🛠️ Шаг 1. Регистрация Бота и Mini App через @BotFather

1.  Откройте Telegram и перейдите в чат с официальным ботом **[@BotFather](https://t.me/BotFather)**.
2.  Создайте нового бота командой `/newbot`. Введите название бота (например, `Inside English Bot`) и юзернейм (например, `InsideEnglish_bot`).
3.  **Создайте Mini App** командой `/newapp`. 
    *   Выберите созданного бота.
    *   Введите название Mini App (`Inside English`).
    *   Введите короткое описание.
    *   Загрузите квадратную картинку приложения (размер 640x640).
    *   **Вставьте URL-адрес:** укажите веб-адрес вашего развернутого Next.js приложения (например, `https://inside-english.vercel.app`).
4.  В завершение BotFather выдаст вам **Telegram Bot Token** и короткую ссылку вида `t.me/InsideEnglish_bot/app`.

---

## 🔒 Шаг 2. Безопасная авторизация через `initData`

Когда пользователь открывает Mini App, Telegram передает строку безопасности `initData` в iframe. Мы написали безопасный роут-обработчик **`app/api/auth/telegram/route.ts`**, который выполняет следующие шаги:

1.  **Считывание и дешифровка:** Роут собирает параметры и строит проверочную строку `dataCheckString`.
2.  **Проверка крипто-подписи:** С помощью HMAC-SHA256, используя ваш **Telegram Bot Token** в качестве соли, бэкенд вычисляет хэш и сравнивает его с присланным хэшем. Это на 100% защищает от подделки данных пользователя.
3.  **Авто-регистрация в Supabase:**
    *   Если пользователь запускает приложение впервые, бэкенд создает для него аккаунт в Supabase Auth под маской `tg_{telegram_id}@inside-english.telegram`.
    *   В метаданные записывается имя, фамилия и юзернейм из Telegram.
    *   Если пользователь уже зарегистрирован, выполняется автоматический вход (`signInWithPassword`).
    *   Клиенту возвращается токен сессии Supabase для локального хранения.

---

## 📲 Шаг 3. Интеграция Telegram WebApp SDK во фронтенд

Мы создали класс-обертку **`lib/telegram.ts`** для работы с нативным SDK. Чтобы задействовать его, выполните следующие шаги:

1.  Подключите скрипт SDK в главном файле `layout.tsx` (в теге `<head>`):
    ```html
    <script src="https://telegram.org/js/telegram-web-app.js" defer></script>
    ```
2.  Инициализируйте приложение при старте:
    ```typescript
    'use client';

    import { useEffect } from 'react';
    import { TelegramSDK } from '@/lib/telegram';

    export default function MainLayout({ children }) {
      useEffect(() => {
        if (TelegramSDK.isTMA()) {
          // Уведомляем Telegram, что приложение загрузилось и его можно показать
          TelegramSDK.ready();
          
          // Применяем тактильный отклик при первом открытии
          TelegramSDK.triggerHaptic('success');
          
          // Синхронизируем авторизацию через initData
          const initData = TelegramSDK.getInitData();
          fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              console.log('Успешный вход в Supabase из Telegram!', data.user);
            }
          });
        }
      }, []);

      return <>{children}</>;
    }
    ```

---

## 🌟 Шаг 4. Монетизация внутри Telegram: Telegram Stars

Apple и Google строго запрещают принимать оплату картами за цифровые товары (подписки, треки) внутри приложений Telegram, если они открыты на iOS/Android. Чтобы обойти это и не получить бан, Telegram внедрил внутреннюю валюту — **Telegram Stars (Звёзды)**.

*   Пользователи покупают «Звёзды» через встроенные покупки Apple/Google (внутри самого Telegram).
*   Внутри вашего Mini App пользователь расплачивается этими Звёздами за подписку Premium.
*   Telegram забирает 30% комиссии, а вы можете выводить полученные Звёзды в реальные деньги через платформу Fragment (в криптовалюту TON) или в фиат с комиссией 0%.

### Схема интеграции Telegram Stars:

1.  Пользователь нажимает «Оформить подписку за 150 Звёзд» на странице тарифов.
2.  Ваш бэкенд создает инвойс через API Telegram: `createInvoiceLink`:
    ```typescript
    // Запрос к Telegram Bot API для генерации платежной ссылки на Звёзды
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: "Inside English Premium (1 месяц)",
        description: "Полный безлимитный доступ ко всем практикам и Shadowing",
        payload: `user_id_${user.id}`,
        provider_token: "", // Пусто для Telegram Stars
        currency: "XTR",     // Код валюты Telegram Stars
        prices: [{ label: "Premium", amount: 150 }] // Цена: 150 Звёзд
      })
    });
    const { result: invoiceLink } = await response.json();
    ```
3.  Бэкенд возвращает `invoiceLink` на фронтенд.
4.  Фронтенд вызывает нативное окно оплаты Telegram:
    ```typescript
    const webApp = TelegramSDK.getWebApp();
    if (webApp) {
      webApp.openInvoice(invoiceLink, (status: string) => {
        if (status === 'paid') {
          // Оплата успешна! Обновляем статус пользователя в Supabase
          alert('Спасибо за покупку! Подписка активирована 🎉');
        } else {
          alert('Платеж отменен или произошла ошибка.');
        }
      });
    }
    ```

---

## 🎨 Шаг 5. Стилизация и Вайб Inside в Telegram

Интерфейс Inside English с его глубоким темно-фиолетовым фоном (`#0D0D14`), неоновыми градиентами и медленными анимациями идеально вписывается в концепцию премиум-сервиса внутри Telegram. 

С помощью `TelegramSDK.triggerHaptic('light')` вы можете добавить легкую нативную вибрацию на:
*   Клик по карточке состояния (Расслабиться / Настроиться / Ко сну).
*   Нажатие Play/Pause в плеере.
*   Каждое распознанное слово в режиме Shadowing.

Это создает потрясающий, тактильный и ультра-премиальный опыт использования приложения, который пользователи захотят рекомендовать друзьям прямо в чатах Telegram!
