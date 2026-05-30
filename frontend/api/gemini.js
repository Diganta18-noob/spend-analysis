// Vercel Serverless Function — proxies Gemini API calls through Vercel (US region)
// This bypasses the "User location is not supported" error from Render (Singapore)
// Using Node.js runtime instead of Edge for longer timeout (60s vs 25s)

export const config = {
  maxDuration: 60, // Maximum allowed on Hobby plan (60s)
};

const FETCH_TIMEOUT_MS = 55000; // 55s — leave 5s buffer before Vercel kills the function

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Proxy-Token');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simple auth — verify request comes from our backend
    const proxyToken = req.headers['x-proxy-token'];
    const expectedToken = process.env.PROXY_SECRET;
    if (expectedToken && (!proxyToken || proxyToken !== expectedToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // req.body is automatically parsed by Vercel Node.js runtime
    const body = req.body;
    if (!body) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    const { modelName, apiVersion, payload } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured on Vercel' });
    }

    if (!modelName || !payload) {
      return res.status(400).json({ error: 'Missing modelName or payload' });
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
        return res.status(504).json({
          error: `Gemini API took too long to respond (>${FETCH_TIMEOUT_MS / 1000}s). Try uploading fewer pages or smaller images.`,
        });
      }
      return res.status(502).json({ error: `Fetch to Gemini failed: ${fetchErr.message}` });
    }

    clearTimeout(timeoutId);

    // Read the response body as text first for safety (avoids crash on non-JSON responses)
    let responseText;
    try {
      responseText = await geminiResponse.text();
    } catch (readErr) {
      return res.status(502).json({ error: `Failed to read Gemini response: ${readErr.message}` });
    }

    // Try to parse as JSON, pass through as-is if valid
    try {
      const data = JSON.parse(responseText);
      return res.status(geminiResponse.status).json(data);
    } catch (_) {
      // Non-JSON response from Gemini (HTML error page, etc.)
      return res.status(geminiResponse.status >= 400 ? geminiResponse.status : 502).json({
        error: `Gemini returned non-JSON response (${geminiResponse.status}): ${responseText.substring(0, 500)}`,
      });
    }
  } catch (unexpectedError) {
    // Top-level catch to prevent FUNCTION_INVOCATION_FAILED
    console.error('[Gemini Proxy] Unexpected error:', unexpectedError);
    return res.status(500).json({
      error: `Proxy internal error: ${unexpectedError.message}`,
    });
  }
}
