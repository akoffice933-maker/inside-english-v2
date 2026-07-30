/**
 * Production-grade HTTP Fetch Utilities for Inside English v2.0.
 * 
 * Provides:
 * 1. fetchWithTimeout: Prevents API requests (like OpenAI, Whisper) from hanging indefinitely.
 * 2. fetchWithRetry: Retries idempotent network calls (like Telegram Bot API answerPreCheckoutQuery)
 *    using exponential backoff to handle temporary network glitches securely under strict SLA windows.
 */

/**
 * Executes an HTTP fetch request with a strict timeout guard.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Executes an HTTP fetch request with an exponential backoff retry policy and timeout guard.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelayMs: number = 100,
  timeoutMs: number = 5000
): Promise<Response> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Execute with a strict timeout guard
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      // If the response indicates a transient server error (5xx), we retry.
      // Otherwise, return immediately (2xx successes or 4xx client errors)
      if (response.status < 500) {
        return response;
      }
      
      throw new Error(`Server responded with status ${response.status}`);
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(`Request failed after ${attempt} attempts. Original error: ${err.message}`);
      }

      // Calculate exponential backoff delay (e.g. 100ms -> 200ms -> 400ms) with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 50;
      console.warn(`[Network Retry] Attempt ${attempt} failed for ${url}. Retrying in ${Math.round(delay)}ms... Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Unreachable code in retry loop.');
}
