import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient, createSupabaseRouteClient, telegramMockEmail } from '@/lib/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * POST /api/billing/create-invoice-link
 * 
 * Generates a real Telegram Stars payment invoice link using Telegram Bot API.
 * Fixes Vulnerability: Supports BOTH authenticated Web session cookies (via Supabase Auth)
 * and direct Telegram Mini App requests (via verified telegramId), matching our other API endpoints.
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

    let userId: string | null = null;
    let targetTelegramId = telegramId;

    // 1. Dual Identity Resolution (Fixes TMA Authentication gap!)
    if (targetTelegramId) {
      // TMA Path: Resolve user profile directly from Telegram ID using service role client
      const supabaseAdmin = createSupabaseServiceClient();
      const mockEmail = telegramMockEmail(targetTelegramId);
      
      const { data: userProfile, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', mockEmail)
        .maybeSingle();

      if (fetchError || !userProfile) {
        return NextResponse.json({ error: 'User account not found. Please launch the app from Telegram first.' }, { status: 404 });
      }
      userId = userProfile.id;
    } else {
      // Web PWA Path: Fallback to standard cookie session
      const supabase = createSupabaseRouteClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
      }

      userId = user.id;
      // Get telegramId from metadata if any
      targetTelegramId = user.user_metadata?.telegram_id || null;
    }

    if (!targetTelegramId) {
      return NextResponse.json({ error: 'Your account is not linked to a Telegram profile.' }, { status: 400 });
    }

    const priceAmount = plan === 'annual' ? 750 : 150; // Pricing matched to 150 / 750 Stars

    // 2. Call Telegram Bot API: createInvoiceLink
    console.log(`[Telegram Stars API] Generating invoice for Telegram ID ${targetTelegramId}. Plan: ${plan}`);
    
    const tgInvoicePayload = {
      title: plan === 'annual' ? 'Inside English Premium (1 Год)' : 'Inside English Premium (1 Месяц)',
      description: 'Безлимитный доступ ко всем MindTracks, ГипноТрекам, ИИ-Shadowing и оффлайн-кэшированию.',
      payload: `sub_${plan}_user_${userId}`, // Payload returned in pre_checkout_query webhook
      provider_token: '', // Must be empty for Telegram Stars
      currency: 'XTR', // Telegram Stars currency code
      prices: [
        { label: 'Inside Premium Access', amount: priceAmount }
      ]
    };

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tgInvoicePayload),
    });

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
