import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase';
import { isRateLimited, getClientIP } from '@/lib/rate-limit';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * POST /api/auth/telegram
 * 
 * Securely authenticates a user launching Inside English from a Telegram Mini App.
 * Validates the cryptographic initData signature using constant-time verification.
 * Also checks the auth_date parameter to prevent malicious replay attacks.
 * 
 * Fixes Vulnerability #6: Implements IP-based rate limiting (Max 5 requests per minute)
 * to prevent spam registrations.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. IP Rate Limiting
    const ip = getClientIP(request);
    const rateLimitKey = `rate_limit_auth_tg_${ip}`;
    const { limited, remaining, resetTime } = await isRateLimited(rateLimitKey, 5, 60000); // 5 requests per minute

    if (limited) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

    const { initData } = await request.json();

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData string in request body' }, { status: 400 });
    }

    // Strict server configuration check.
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('[Telegram Auth Error] Bot token is missing in environmental settings.');
      return NextResponse.json({ error: 'Authentication service misconfigured.' }, { status: 500 });
    }

    // 2. Validate Cryptographic Signature (Telegram WebApp Standard Security)
    const { isValid, authDate } = validateTelegramInitData(initData, TELEGRAM_BOT_TOKEN);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid cryptographic signature.' }, { status: 403 });
    }

    // Replay Attack protection (validate requests older than 24 hours).
    const nowUnix = Math.floor(Date.now() / 1000);
    const timeDelta = nowUnix - authDate;
    if (timeDelta > 86400 || timeDelta < -60) {
      return NextResponse.json({ error: 'Authentication payload has expired (Replay protection activated).' }, { status: 403 });
    }

    // 3. Parse User Data from validated initData
    const params = new URLSearchParams(initData);
    const userString = params.get('user');
    if (!userString) {
      return NextResponse.json({ error: 'User payload missing in telegram initData' }, { status: 400 });
    }

    const tgUser = JSON.parse(userString);
    const telegramId = tgUser.id; // Telegram User ID
    const firstName = tgUser.first_name || '';
    const lastName = tgUser.last_name || '';
    const username = tgUser.username || '';

    // Create a deterministic mock email & password based on user ID and our secret bot token
    const mockEmail = `tg_${telegramId}@inside-english.telegram`;
    const tempPassword = crypto.createHash('sha256').update(telegramId.toString() + TELEGRAM_BOT_TOKEN).digest('hex');

    // 4. Sync with Supabase Auth & PostgreSQL
    const supabase = createSupabaseRouteClient();

    let session: any = null;
    let userId: string | undefined = undefined;

    // Try signing in the Telegram user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: mockEmail,
      password: tempPassword,
    });

    // If user does not exist, register them (Auto Sign Up)
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      console.log(`[Telegram Auth] Registering new user: tg_***${String(telegramId).slice(-4)}@...`);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: mockEmail,
        password: tempPassword,
        options: {
          data: {
            name: `${firstName} ${lastName}`.trim(),
            telegram_username: username,
            telegram_id: telegramId
          }
        }
      });

      if (signUpError) {
        return NextResponse.json({ error: `Registration failed: ${signUpError.message}` }, { status: 500 });
      }

      session = signUpData.session;
      userId = signUpData.user?.id;
    } else if (signInError) {
      return NextResponse.json({ error: `Authentication error: ${signInError.message}` }, { status: 500 });
    } else {
      session = signInData.session;
      userId = signInData.user?.id;
    }

    // 5. Return Session Tokens to client with remaining rate limit headers
    const responseHeaders = new Headers({
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString()
    });

    return NextResponse.json({
      success: true,
      session,
      user: {
        id: userId,
        name: `${firstName} ${lastName}`.trim(),
        username,
        email: mockEmail
      }
    }, { 
      status: 200,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error('Telegram authentication handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Validates the cryptographically signed initData string sent by Telegram Mini Apps.
 * Protects against timing attacks by using crypto.timingSafeEqual.
 */
function validateTelegramInitData(initData: string, botToken: string): { isValid: boolean; authDate: number } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const authDateString = params.get('auth_date');

    if (!hash || !authDateString) {
      return { isValid: false, authDate: 0 };
    }

    const authDate = parseInt(authDateString, 10);

    // Remove hash and sort remaining parameters alphabetically
    const keys = Array.from(params.keys()).filter((key) => key !== 'hash');
    keys.sort();

    // Reconstruct data-check-string (key=value separated by newlines)
    const dataCheckString = keys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    // Generate secret key by hashing our Bot Token using "WebAppData" as salt
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate computed hex hash
    const computedHashHex = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // timingSafeEqual to guard against timing attacks on HMAC signatures
    const bufferComputed = Buffer.from(computedHashHex, 'utf8');
    const bufferReceived = Buffer.from(hash, 'utf8');

    if (bufferComputed.length !== bufferReceived.length) {
      return { isValid: false, authDate: 0 };
    }

    const isSignatureValid = crypto.timingSafeEqual(bufferComputed, bufferReceived);

    return {
      isValid: isSignatureValid,
      authDate
    };
  } catch (err) {
    console.error('Failed to parse or validate initData:', err);
    return { isValid: false, authDate: 0 };
  }
}
