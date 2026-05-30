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
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { modelName, apiVersion, payload } = body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 500);
  }

  if (!modelName || !payload) {
    return jsonResponse({ error: 'Missing modelName or payload' }, 400);
  }

  const version = apiVersion || 'v1beta';
  const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${apiKey}`;

  try {
    // Use AbortController to enforce a timeout before Vercel kills the function
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const geminiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await geminiResponse.json();
    return jsonResponse(data, geminiResponse.status);
  } catch (error) {
    if (error.name === 'AbortError') {
      return jsonResponse({
        error: `Gemini API took too long to respond (>${FETCH_TIMEOUT_MS / 1000}s). Try uploading fewer pages or smaller images.`,
      }, 504);
    }
    return jsonResponse({ error: error.message }, 502);
  }
}
