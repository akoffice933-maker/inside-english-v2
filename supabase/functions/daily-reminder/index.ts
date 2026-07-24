// Supabase Edge Function: daily-reminder
// Written in Deno TypeScript.
// Designed to run automatically as a Cron job (e.g. via Supabase pg_cron, GitHub Actions, or Vercel Cron).
// Automatically finds users who haven't practiced today, grabs their active push tokens,
// and sends them a dynamic notification with their actual daily streak ("Стрик: X дней 🔥").

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "inside-english-fcm";
const FCM_SERVICE_ACCOUNT_JWT = Deno.env.get("FCM_SERVICE_ACCOUNT_JWT") ?? ""; // OAuth2 token for Google API v1

serve(async (req) => {
  // Enforce secure trigger (e.g. Cron Key authorization) to prevent unauthorized manual execution
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized cron trigger." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("[Daily Reminder] Launching morning practice notification run...");

    // 1. Fetch users who have active push tokens and have NOT completed any practice today
    // For simplicity, we search for users whose last record in user_progress is older than today,
    // joined with their push tokens.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Query users with active push tokens
    const { data: targetUsers, error: usersError } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        name,
        streak,
        user_push_tokens (
          token,
          platform
        )
      `)
      .not("user_push_tokens", "is", null);

    if (usersError) {
      throw new Error(`Failed to fetch target users: ${usersError.message}`);
    }

    if (!targetUsers || targetUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No active users with push tokens found." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Filter out users who already finished a track today
    const userIds = targetUsers.map((u) => u.id);
    const { data: completedToday, error: progressError } = await supabaseAdmin
      .from("user_progress")
      .select("user_id")
      .in("user_id", userIds)
      .eq("is_completed", true)
      .gte("listened_at", todayStart.toISOString());

    if (progressError) {
      console.error("[Daily Reminder] Error checking today's completions:", progressError);
    }

    const completedUserIdsSet = new Set(completedToday?.map((p) => p.user_id) || []);
    
    // Filter down to the final notification queue
    const notificationQueue = targetUsers.filter((user) => !completedUserIdsSet.has(user.id));

    console.log(`[Daily Reminder] Found ${notificationQueue.length} users due for a morning practice reminder.`);

    let successCount = 0;
    let failureCount = 0;

    // 3. Send Push Notifications via FCM HTTP v1 API
    for (const user of notificationQueue) {
      const tokens = user.user_push_tokens || [];
      const streak = user.streak || 0;
      const firstName = user.name || "друг";

      // Dynamic personalized copy to maintain the Streak
      const title = `С добрым утром, ${firstName}! ☀️`;
      const body = streak > 0 
        ? `Не упустите свой огненный стрик в ${streak} дн.! 🔥 Всего 5 минут практики отделяют вас от свободного английского сегодня.`
        : `Начните день с осознанной практики английского! 🧘 Ваше утреннее состояние готово к первому MindTrack.`;

      for (const tokenObj of tokens) {
        try {
          // Construct the Firebase FCM v1 payload
          const fcmMessage = {
            message: {
              token: tokenObj.token,
              notification: {
                title,
                body,
              },
              data: {
                action: "morning_reminder",
                // Passing a recommended track id to auto-start the player
                trackId: "5f3a02a9-d6e6-4db0-bd91-31427a71a39f" 
              },
              apns: {
                payload: {
                  aps: {
                    sound: "default",
                    badge: 1,
                  }
                }
              }
            }
          };

          // Dispatch to Google Firebase API
          // In real production, FCM_SERVICE_ACCOUNT_JWT is a freshly generated OAuth2 Bearer token 
          // fetched using Google Auth libraries or Google's Metadata service.
          const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FCM_SERVICE_ACCOUNT_JWT}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(fcmMessage),
          });

          if (fcmResponse.ok) {
            successCount++;
          } else {
            const errBody = await fcmResponse.text();
            console.error(`[Daily Reminder] FCM delivery failed for token ${tokenObj.token.substring(0, 10)}... :`, errBody);
            failureCount++;
          }

        } catch (tokenErr) {
          console.error(`[Daily Reminder] Failed to dispatch token:`, tokenErr);
          failureCount++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processedUsers: notificationQueue.length,
      dispatched: {
        success: successCount,
        failed: failureCount
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[Daily Reminder] Cron run failed with fatal error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
