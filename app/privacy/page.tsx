import React from 'react';
import AppShell from '@/components/AppShell';

export default function PrivacyPolicyPage() {
  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-sm mx-auto font-sans leading-relaxed text-sm text-white/80 pb-20">
        <h1 className="text-2xl font-bold tracking-tight font-serif text-white">Политика конфиденциальности</h1>
        <p className="text-xs text-white/50">Последнее обновление: 24 июля 2026 г.</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white mt-4">1. Сбор персональных данных</h2>
          <p>
            Мы собираем только те данные, которые необходимы для предоставления качественного образовательного опыта:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Идентификатор пользователя Telegram (для авторизации в Mini App).</li>
            <li>История прослушивания аудиоуроков и прогресс (для формирования рекомендаций).</li>
            <li>Надиктованные аудиозаписи в режиме Shadowing (для локального или нейросетевого анализа произношения).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white mt-4">2. Обработка и защита данных</h2>
          <p>
            Все персональные данные обрабатываются и хранятся на защищенных серверах Supabase Cloud. В соответствии с Федеральным законом РФ № 152-ФЗ «О персональных данных», мы принимаем все необходимые меры для предотвращения несанкционированного доступа к вашей личной информации.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white mt-4">3. Использование ИИ-сервисов</h2>
          <p>
            Для функции Shadowing мы можем направлять анонимизированные аудиозаписи в сторонние API (например, OpenAI Whisper). Эти файлы не содержат ваших личных идентификаторов и используются исключительно для распознавания текста.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white mt-4">4. Изменения политики</h2>
          <p>
            Мы можем периодически обновлять настоящую Политику. Мы уведомим вас о любых изменениях, опубликовав новую версию в приложении.
          </p>
        </section>

        <footer className="pt-6 border-t border-white/5 text-xs text-white/40">
          По вопросам обработки персональных данных пишите на: support@inside-english.io
        </footer>
      </div>
    </AppShell>
  );
}
