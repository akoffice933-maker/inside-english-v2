import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { fetchWithRetry } from '@/lib/fetch-utils';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_WEBHOOK_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || '';

/**
 * POST /api/telegram/webhook
 * 
 * Official Webhook Handler for the Telegram Bot API.
 * 
 * Fixes Critical Vulnerability (Bot Webhook Backdoor):
 * Securely authenticates every incoming webhook request from Telegram using 
 * the 'X-Telegram-Bot-Api-Secret-Token' header and constant-time string comparison (timingSafeEqual).
 * Prevents unauthorized attackers from spoofing successful_payment payloads.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Telegram Webhook Secret Token (MANDATORY SECURITY LAYER)
    // Official Docs: https://core.telegram.org/bots/api#setwebhook
    const receivedToken = request.headers.get('x-telegram-bot-api-secret-token') || '';

    if (!TELEGRAM_WEBHOOK_SECRET_TOKEN) {
      console.error('[Telegram Webhook Error] TELEGRAM_WEBHOOK_SECRET_TOKEN is not configured in environmental settings.');
      return NextResponse.json({ error: 'Webhook billing configuration error.' }, { status: 500 });
    }

    const bufferExpected = Buffer.from(TELEGRAM_WEBHOOK_SECRET_TOKEN, 'utf8');
    const bufferReceived = Buffer.from(receivedToken, 'utf8');

    // Constant-time check prevents timing-attacks and checks buffer length
    const isTokenValid = bufferExpected.length === bufferReceived.length && 
                         crypto.timingSafeEqual(bufferExpected, bufferReceived);

    if (!isTokenValid) {
      console.warn('[Telegram Webhook Security Alert] Blocked unauthorized POST request attempting to access webhook.');
      return NextResponse.json({ error: 'Unauthorized. Invalid webhook token.' }, { status: 401 });
    }

    const update = await request.json();

    // Ensure Bot Token is configured on the host server
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[Telegram Webhook Error] TELEGRAM_BOT_TOKEN is not configured.');
      return NextResponse.json({ error: 'Webhook service misconfigured.' }, { status: 500 });
    }

    // ==========================================
    // SCENARIO 1: PRE-CHECKOUT QUERY (Verification Step)
    // ==========================================
    if (update.pre_checkout_query) {
      const preCheckoutQueryId = update.pre_checkout_query.id;
      console.log(`[Telegram Webhook] Received pre_checkout_query. Approving transaction ID: ${preCheckoutQueryId}`);

      // answerPreCheckoutQuery: Approves the payment and allows Telegram to process charge (MANDATORY)
      // Uses a retry policy with exponential backoff (max 3 times, 5s timeout) to satisfy the strict 10s SLA (Vulnerability Fix #2 & #5)
      const response = await fetchWithRetry(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutQueryId,
          ok: true
        })
      }, 3, 100, 5000);

      if (!response.ok) {
        const errDetails = await response.text();
        console.error('[Telegram Webhook] Failed to answer pre_checkout_query:', errDetails);
        return NextResponse.json({ error: 'Failed to approve pre-checkout.' }, { status: 502 });
      }

      console.log(`[Telegram Webhook] Successfully approved pre_checkout_query ID: ${preCheckoutQueryId}`);
      return NextResponse.json({ success: true, status: 'approved' }, { status: 200 });
    }

    // ==========================================
    // SCENARIO 2: SUCCESSFUL PAYMENT (Activation Step)
    // ==========================================
    const message = update.message;
    if (message && message.successful_payment) {
      const payment = message.successful_payment;
      const invoicePayload = payment.invoice_payload; // e.g. "sub_monthly_user_uuid"
      console.log(`[Telegram Webhook] Payment successful! Payload received: "${invoicePayload.substring(0, 15)}..."`);

      // Extract the Supabase user UUID from the payload
      const payloadMatch = invoicePayload.match(/user_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      
      if (!payloadMatch) {
        console.error(`[Telegram Webhook] Failed to extract user UUID from invoice payload`);
        return NextResponse.json({ error: 'Invalid invoice payload structure.' }, { status: 400 });
      }

      const userId = payloadMatch[1];
      console.log(`[Telegram Webhook] Activating Inside Premium for User UUID: ${userId.substring(0, 8)}...`);

      // Update the settings JSONB column to activate premium access
      const supabaseAdmin = createSupabaseServiceClient();

      // Fetch user profile settings
      const { data: userProfile, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('settings')
        .eq('id', userId)
        .single();

      if (fetchError || !userProfile) {
        console.error(`[Telegram Webhook] Failed to fetch user profile for UUID ${userId}:`, fetchError);
        return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
      }

      const currentSettings = userProfile.settings || {};
      const updatedSettings = {
        ...currentSettings,
        is_premium: true
      };

      // Set is_premium = true in Postgres (RLS Bypassed via service_role)
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ settings: updatedSettings })
        .eq('id', userId);

      if (updateError) {
        console.error(`[Telegram Webhook] Failed to update user premium settings:`, updateError);
        return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
      }

      console.log(`[Telegram Webhook] Inside Premium successfully activated for user UUID: ${userId.substring(0, 8)}...`);
      return NextResponse.json({ success: true, status: 'premium_activated' }, { status: 200 });
    }

    // Default catch-all response for other bot webhook updates
    return NextResponse.json({ success: true, status: 'ignored_update_type' }, { status: 200 });

  } catch (err: any) {
    console.error('[Telegram Webhook Error] Global exception:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
