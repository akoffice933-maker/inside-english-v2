import React from 'react';
import AppShell from '@/components/AppShell';

export default function TermsOfServicePage() {
  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-sm mx-auto font-sans leading-relaxed text-sm text-white/80 pb-20">
        <h1 className="text-2xl font-bold tracking-tight font-serif text-white">Условия использования</h1>
        <p className="text-xs text-white/50">Последнее обновление: 24 июля 2026 г.</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white mt-4">1. Предоставление услуг</h2>
          <p>
            Inside English v2.0 предоставляет пользователям доступ к аудиоурокам (MindTracks, ГипноТреки), упражнениям на повторение (Shadowing) и персональной статистике. Доступ может быть свободным (базовым) или платным (подписка Premium).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white mt-4">2. Платная подписка (Premium)</h2>
          <p>
            Подписка Premium оформляется через встроенные покупки Apple App Store (посредством RevenueCat) или через внутреннюю валюту Telegram Stars (внутри Telegram Mini App).
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Оплата списывается в момент подтверждения покупки.</li>
            <li>Отмена подписки и автопродление регулируются правилами соответствующей платформы (App Store или Telegram).</li>
            <li>Возврат средств осуществляется через техническую поддержку App Store или бота Telegram.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white mt-4">3. Ответственность</h2>
          <p>
            Приложение предоставляется «как есть» (as is). Мы стремимся обеспечить 100% доступность сервиса, но не несем ответственности за временные сбои в работе сети, сторонних ИИ-моделей (OpenAI) или серверов авторизации.
          </p>
        </section>

        <footer className="pt-6 border-t border-white/5 text-xs text-white/40">
          Оформляя подписку, вы соглашаетесь с условиями публичной оферты.
        </footer>
      </div>
    </AppShell>
  );
}
