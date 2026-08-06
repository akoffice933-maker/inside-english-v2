"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import { TelegramSDK } from "@/lib/telegram";
import { Crown, Bell, Globe, Settings, LogOut, Check, Download, Trash2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { springs, reducedMotionTransition } from "@/lib/animations";
import { useReducedMotion } from "framer-motion";
import { registerPushNotifications, syncPushToken } from "@/lib/notifications";
import PremiumCard from "@/components/PremiumBadge";

export default function ProfilePage() {
  const reduced = useReducedMotion();
  const [user, setUser] = useState<{ firstName: string; telegramId: string | null }>({
    firstName: "Learner",
    telegramId: null,
  });
  const [isPro, setIsPro] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [hapticOn, setHapticOn] = useState(true);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    TelegramSDK.triggerHaptic("medium");
    try {
      const id = user.telegramId;
      const r = await fetch(`/api/user/me${id ? `?telegramId=${id}` : ""}`);
      if (!r.ok) throw new Error("Export failed");
      const data = await r.json();
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `inside_english_user_data_${id || 'web'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      TelegramSDK.triggerHaptic("success");
    } catch (err) {
      console.error(err);
      alert("Не удалось экспортировать данные. Попробуйте позже.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = window.confirm("🚨 ВНИМАНИЕ! Вы уверены, что хотите навсегда удалить свой аккаунт и все связанные с ним данные в соответствии с законом ФЗ-152 РФ / GDPR? Это действие полностью сотрет ваш прогресс и словарь, и его невозможно будет отменить.");
    if (!isConfirmed) return;

    setIsDeleting(true);
    TelegramSDK.triggerHaptic("warning");
    try {
      const res = await fetch('/api/user/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: user.telegramId })
      });
      
      if (!res.ok) throw new Error("Deletion failed");
      const result = await res.json();
      TelegramSDK.triggerHaptic("success");
      alert(result.message);
      
      // Clear local state and go to home
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить аккаунт. Пожалуйста, обратитесь в службу поддержки.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const tg = TelegramSDK.getUser();
    const id = tg ? String(tg.id) : null;
    setUser({ firstName: tg?.first_name ?? "Learner", telegramId: id });

    const fetchPremium = async () => {
      try {
        const r = await fetch(`/api/billing/me${id ? `?telegramId=${id}` : ""}`);
        const j = await r.json();
        if (typeof j.isPremium === "boolean") setIsPro(j.isPremium);
      } catch {
        /* ignore */
      }
    };
    void fetchPremium();
  }, []);

  const togglePush = async () => {
    if (pushOn) {
      setPushOn(false);
      return;
    }
    TelegramSDK.triggerHaptic("medium");
    const token = await registerPushNotifications();
    if (token) {
      setPushOn(true);
      await syncPushToken(token, user.telegramId ?? undefined);
    }
  };

  return (
    <AppShell>
      <SectionHeader title="Профиль" />

      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={reduced ? reducedMotionTransition : springs.gentle}
        className="glass-panel mb-6 p-5"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#6C3CE1] to-[#E94057] text-xl font-bold text-white shadow-glow-purple">
            {user.firstName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold text-white">{user.firstName}</div>
            <div className="text-xs text-white/50">
              {user.telegramId ? `Telegram · ${user.telegramId}` : "Web-сессия"}
            </div>
          </div>
          {isPro && (
            <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#E94057] px-3 py-1 text-xs font-bold text-white shadow-glow-purple">
              <Crown size={12} />
              PRO
            </div>
          )}
        </div>
      </motion.div>

      <SectionHeader title="Настройки" />
      <div className="glass-panel mb-6 divide-y divide-white/5 overflow-hidden">
        <SettingRow
          icon={<Bell size={16} />}
          title="Push-уведомления"
          subtitle="Напоминания о ежедневной практике"
          toggle
          value={pushOn}
          onToggle={togglePush}
        />
        <SettingRow
          icon={<Globe size={16} />}
          title="Тактильная обратная связь"
          subtitle="Вибрации на нажатиях"
          toggle
          value={hapticOn}
          onToggle={() => {
            setHapticOn((v) => !v);
            TelegramSDK.triggerHaptic("light");
          }}
        />
        <SettingRow
          icon={<Settings size={16} />}
          title="Язык интерфейса"
          subtitle="Русский"
        />
      </div>

      {!isPro && (
        <>
          <SectionHeader title="Стать PRO" />
          <PremiumCard
            isPro={isPro}
            onUpgrade={() => TelegramSDK.triggerHaptic("medium")}
          />
        </>
      )}

      {/* NEW GDPR / PRIVACY AND DATA SECTION */}
      <SectionHeader title="Конфиденциальность и данные" />
      <div className="glass-panel mb-6 overflow-hidden divide-y divide-white/5">
        <button 
          onClick={handleExportData}
          disabled={isExporting}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/80">
            <Download size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Экспорт персональных данных</div>
            <div className="truncate text-xs text-white/50">Запросить архив в формате JSON (ФЗ-152 / GDPR)</div>
          </div>
          <span className="text-xs text-white/40">›</span>
        </button>

        <button 
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-red-500/5 transition text-red-400"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-400">
            <Trash2 size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Удаление аккаунта навсегда</div>
            <div className="truncate text-xs text-red-400/50">Безвозвратно стереть профиль, прогресс и слова</div>
          </div>
          <span className="text-xs text-red-400/40">›</span>
        </button>
      </div>

      <div className="mt-8 grid place-items-center pb-6">
        <button className="flex items-center gap-2 text-xs text-white/50">
          <LogOut size={12} />
          Выйти из аккаунта
        </button>
      </div>
    </AppShell>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  toggle,
  value,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  toggle?: boolean;
  value?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/80">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="truncate text-xs text-white/50">{subtitle}</div>
      </div>
      {toggle ? (
        <button
          onClick={onToggle}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            value ? "bg-gradient-to-r from-[#6C3CE1] to-[#E94057]" : "bg-white/10"
          }`}
          aria-pressed={value}
        >
          <motion.span
            layout
            transition={springs.snappy}
            className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white ${
              value ? "right-0.5" : "left-0.5"
            }`}
          >
            {value && <Check size={10} className="text-[#6C3CE1]" />}
          </motion.span>
        </button>
      ) : (
        <span className="text-xs text-white/40">›</span>
      )}
    </div>
  );
}
