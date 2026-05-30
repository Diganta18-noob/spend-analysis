// Vercel Serverless Function — proxies Gemini API calls through Vercel (US region)
// This bypasses the "User location is not supported" error from Render (Singapore)
// Using Node.js runtime instead of Edge for longer timeout (60s vs 25s)

export const config = {
  maxDuration: 60, // Maximum allowed on Hobby plan (60s)
};

const FETCH_TIMEOUT_MS = 55000; // 55s — leave 5s buffer before Vercel kills the function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Token',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export default async function handler(request) {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Simple auth — verify request comes from our backend
    const proxyToken = request.headers.get('x-proxy-token');
    const expectedToken = process.env.PROXY_SECRET;
    if (expectedToken && (!proxyToken || proxyToken !== expectedToken)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      return jsonResponse({ error: `Invalid JSON body: ${parseErr.message}` }, 400);
    }

    const { modelName, apiVersion, payload } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY not configured on Vercel' }, 500);
    }

    if (!modelName || !payload) {
      return jsonResponse({ error: 'Missing modelName or payload' }, 400);
    }

    const version = apiVersion || 'v1beta';
    const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${apiKey}`;

    // Use AbortController to enforce a timeout before Vercel kills the function
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let geminiResponse;
    try {
      geminiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return jsonResponse({
          error: `Gemini API took too long to respond (>${FETCH_TIMEOUT_MS / 1000}s). Try uploading fewer pages or smaller images.`,
        }, 504);
      }
      return jsonResponse({ error: `Fetch to Gemini failed: ${fetchErr.message}` }, 502);
    }

    clearTimeout(timeoutId);

    // Read the response body as text first for safety (avoids crash on non-JSON responses)
    let responseText;
    try {
      responseText = await geminiResponse.text();
    } catch (readErr) {
      return jsonResponse({ error: `Failed to read Gemini response: ${readErr.message}` }, 502);
    }

    // Try to parse as JSON, pass through as-is if valid
    try {
      const data = JSON.parse(responseText);
      return jsonResponse(data, geminiResponse.status);
    } catch (_) {
      // Non-JSON response from Gemini (HTML error page, etc.)
      return jsonResponse({
        error: `Gemini returned non-JSON response (${geminiResponse.status}): ${responseText.substring(0, 500)}`,
      }, geminiResponse.status >= 400 ? geminiResponse.status : 502);
    }
  } catch (unexpectedError) {
    // Top-level catch to prevent FUNCTION_INVOCATION_FAILED
    console.error('[Gemini Proxy] Unexpected error:', unexpectedError);
    return jsonResponse({
      error: `Proxy internal error: ${unexpectedError.message}`,
    }, 500);
  }
}
