// Supabase Edge Function: revenuecat-webhook (SECURE & COMPREHENSIVE)
// Written for Deno environment (Deno Deploy).
// Handles constant-time secret verification and proper TRANSFER event recipient mapping.
// Resolves Vulnerability #3: Bridges Telegram ID lookup (e.g. "1234567") and Supabase UUID lookup.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface RevenueCatEvent {
  event: {
    id: string;
    type: "INITIAL_PURCHASE" | "RENEWAL" | "CANCELLATION" | "EXPIRATION" | "BILLING_ISSUE" | "PRODUCT_CHANGE" | "TRANSFER";
    app_user_id: string; // The user associated with the event (can be Supabase UUID or Telegram ID)
    original_app_user_id?: string; // The source user in case of a TRANSFER event
    product_id: string;
    entitlement_id: string;
    expiration_at_ms: number | null;
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  // 1. Constant-Time Webhook Secret Verification (timingSafeEqual)
  const authHeader = req.headers.get("Authorization");
  const expectedAuth = `Bearer ${WEBHOOK_SECRET}`;

  if (!authHeader || !WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized. Missing secret." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expectedAuth);
  
  let isAuthValid = a.length === b.length;
  if (isAuthValid) {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    isAuthValid = result === 0;
  }

  if (!isAuthValid) {
    return new Response(JSON.stringify({ error: "Unauthorized. Invalid token." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload: RevenueCatEvent = await req.json();
    const { type, app_user_id, original_app_user_id } = payload.event;

    if (!app_user_id) {
      return new Response(JSON.stringify({ error: "Missing app_user_id in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log(`[RevenueCat Webhook] Verified event "${type}" for user: ${app_user_id}`);

    // Helper to resolve user ID dynamically (UUID vs Telegram ID mapping)
    const resolveUserRecord = async (identifier: string) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      let query = supabaseAdmin.from("users").select("id, settings");
      
      if (isUuid) {
        query = query.eq("id", identifier);
      } else {
        // Look up by Telegram ID (e.g., "1234567") via mock email
        const mockEmail = `tg_${identifier}@inside-english.telegram`;
        query = query.eq("email", mockEmail);
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error(`[RevenueCat Webhook] Error resolving user profile ${identifier}:`, error);
        return null;
      }
      return data;
    };

    // Helper to update premium settings column for a user
    const updateUserPremium = async (userIdentity: string, active: boolean) => {
      const userProfile = await resolveUserRecord(userIdentity);

      if (!userProfile) {
        console.warn(`[RevenueCat Webhook] User ${userIdentity} profile not found in database.`);
        return false;
      }

      const currentSettings = userProfile.settings || {};
      const updatedSettings = {
        ...currentSettings,
        is_premium: active
      };

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ settings: updatedSettings })
        .eq("id", userProfile.id);

      if (updateError) {
        console.error(`[RevenueCat Webhook] Database update failed for user ${userProfile.id}:`, updateError);
        return false;
      }
      return true;
    };

    // 2. Handle events including complex TRANSFER events (Fixes Vulnerability #7)
    if (type === "TRANSFER") {
      let originalSuccess = true;
      if (original_app_user_id) {
        console.log(`[RevenueCat Webhook] Deactivating transferred premium from original user: ${original_app_user_id}`);
        originalSuccess = await updateUserPremium(original_app_user_id, false);
      }
      
      console.log(`[RevenueCat Webhook] Activating transferred premium to new recipient user: ${app_user_id}`);
      const targetSuccess = await updateUserPremium(app_user_id, true);

      return new Response(JSON.stringify({ 
        success: originalSuccess && targetSuccess, 
        message: "Subscription TRANSFER processed successfully." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Standard Entitlement Updates
    let isPremiumActive = false;

    switch (type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
        isPremiumActive = true;
        break;

      case "EXPIRATION":
      case "CANCELLATION":
      case "BILLING_ISSUE":
        isPremiumActive = false;
        break;

      default:
        console.log(`[RevenueCat Webhook] Unreactive event: ${type}`);
        return new Response(JSON.stringify({ received: true, status: "ignored" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    }

    const updateSuccess = await updateUserPremium(app_user_id, isPremiumActive);
    
    if (!updateSuccess) {
      return new Response(JSON.stringify({ error: "Update failed (User profile not loaded)" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `User premium status updated: ${isPremiumActive}` 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(`[RevenueCat Webhook] Critical Exception:`, err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
