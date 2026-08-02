import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { fetchWithRetry } from '@/lib/fetch-utils';
import { resolveUserFromRequest } from '@/lib/auth-helpers';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * POST /api/billing/create-invoice-link
 * 
 * Generates a real Telegram Stars payment invoice link using Telegram Bot API.
 * Access: Authenticated users (Web Session or verified Telegram InitData).
 * 
 * Fixes: Uses unified resolveUserFromRequest to support both TMA (telegramId) and Cookie Auth.
 */
export async function POST(request: NextRequest) {
  try {
    const { plan, telegramId } = await request.json();

    if (plan !== 'monthly' && plan !== 'annual') {
      return NextResponse.json({ error: 'Invalid subscription plan.' }, { status: 400 });
    }

    // Ensure Bot Token is configured on the host server
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[Telegram Stars Error] TELEGRAM_BOT_TOKEN is not configured.');
      return NextResponse.json({ error: 'Telegram payment billing service unavailable.' }, { status: 503 });
    }

    // 1. Resolve User ID and Settings (Fixes TMA Authentication gap!)
    const userProfile = await resolveUserFromRequest(request, telegramId);

    if (!userProfile) {
      return NextResponse.json({ error: 'User account not found. Please launch the app from Telegram first.' }, { status: 404 });
    }

    // Get telegramId from profile metadata if not passed directly (for Web PWA users)
    const targetTelegramId = telegramId || userProfile.settings?.telegram_id;

    if (!targetTelegramId) {
      return NextResponse.json({ error: 'Your account is not linked to a Telegram profile.' }, { status: 400 });
    }

    const priceAmount = plan === 'annual' ? 750 : 150; // Pricing matched to 150 / 750 Stars

    // 2. Call Telegram Bot API: createInvoiceLink
    console.log(`[Telegram Stars API] Generating invoice for Telegram ID ***${String(targetTelegramId).slice(-4)}. Plan: ${plan}`);
    
    const tgInvoicePayload = {
      title: plan === 'annual' ? 'Inside English Premium (1 Год)' : 'Inside English Premium (1 Месяц)',
      description: 'Безлимитный доступ ко всем MindTracks, ГипноТрекам, ИИ-Shadowing и оффлайн-кэшированию.',
      payload: `sub_${plan}_user_${userProfile.id}`, // Payload returned in pre_checkout_query webhook
      provider_token: '', // Must be empty for Telegram Stars
      currency: 'XTR', // Telegram Stars currency code
      prices: [
        { label: 'Inside Premium Access', amount: priceAmount }
      ]
    };

    // Uses robust fetchWithRetry with exponential backoff and 6s timeout guard (Vulnerability Fix #2 & #5)
    const response = await fetchWithRetry(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tgInvoicePayload),
    }, 3, 100, 6000);

    if (!response.ok) {
      const errDetails = await response.text();
      console.error(`[Telegram Stars API] Call failed:`, errDetails);
      return NextResponse.json({ error: 'Failed to generate Telegram Stars invoice.' }, { status: 502 });
    }

    const resData = await response.json();
    if (!resData.ok || !resData.result) {
      return NextResponse.json({ error: 'Invalid response from Telegram Bot API.' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      invoiceLink: resData.result
    }, { status: 200 });

  } catch (err: any) {
    console.error('Telegram Stars Invoice Route exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
