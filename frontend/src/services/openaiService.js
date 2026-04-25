const AI_PROMPT = `You are an expert financial analyst specialising in personal bank statement analysis for Indian users.

The user has uploaded one or more photos of their bank account statement. Your task is to:
1. Carefully read every transaction visible in the images
2. Extract ALL debit/expense transactions (ignore credits/deposits)
3. Categorise each transaction intelligently into one of these categories:
   - Rent, Insurance, Food & Dining, Office Food, Transport, Groceries, Bills & Subscriptions, Personal Transfer, Self Transfer, Entertainment, Shopping, Healthcare, Education, Other
4. Identify the statement period (from/to dates) and bank name if visible
5. Produce a complete spend analysis

IMPORTANT RULES:
- Extract EVERY debit transaction visible — do not skip any
- For UPI transfers to individuals (names), categorise as "Personal Transfer"
- For self-transfers between own accounts, use "Self Transfer"
- For canteen/cafeteria, use "Office Food"
- For restaurants/street food/delivery, use "Food & Dining"
- For cab/auto/metro/bus, use "Transport"
- Dates should be in YYYY-MM-DD format; if year is unclear, infer from context
- Amounts should be numeric (no currency symbols)
- Vendor names should be clean and concise (max 40 chars)

Respond ONLY with a valid JSON object — no markdown, no code fences, no preamble. The structure must be:
{
  "period": "01 Apr – 25 Apr 2026",
  "bank": "Bank of India",
  "account_holder": "Name if visible or null",
  "opening_balance": 388.01,
  "closing_balance": 124.00,
  "total_credits": 36770.00,
  "transactions": [
    {
      "date": "2026-04-02",
      "desc": "SmartQ Canteen",
      "amount": 64.00,
      "cat": "Office Food"
    }
  ],
  "insights": [
    {
      "icon": "emoji here",
      "title": "Short insight title",
      "body": "2-3 sentence detailed observation with specific amounts and dates",
      "badge": "Fixed|Variable|Pattern|Spike|Review|Planned|Low|High",
      "color": "#hex color"
    }
  ]
}

Generate 6-8 insights that are specific, data-driven, and genuinely useful. Reference actual amounts and payees from the data. Highlight patterns, anomalies, and actionable observations.`;

/**
 * Convert a File to a base64 data string (with the data:... prefix required by OpenAI).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call OpenAI gpt-4o-mini with bank statement images and return structured JSON.
 * @param {File[]} files - Array of image files
 * @returns {Promise<object>} - Parsed financial analysis JSON
 */
export async function analyzeStatements(files) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("Missing or placeholder API key. Please add your actual OpenAI API key to the frontend/.env file.");
  }

  // Build image content array
  const imageContents = await Promise.all(
    files.map(async (file) => {
      const dataUri = await fileToBase64(file);
      return {
        type: "image_url",
        image_url: {
          url: dataUri,
        },
      };
    })
  );

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: AI_PROMPT },
          ...imageContents,
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  };

  const endpoint = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    try {
      const parsedBody = JSON.parse(errBody);
      if (parsedBody?.error?.message) {
        if (parsedBody.error.message.includes("Incorrect API key")) {
          throw new Error("Invalid API Key: Please verify your VITE_OPENAI_API_KEY in the frontend/.env file.");
        }
        if (parsedBody.error.message.includes("quota")) {
          throw new Error("Quota Exceeded: Your OpenAI account has run out of credits or hit its usage limit.");
        }
        throw new Error(`AI Error: ${parsedBody.error.message}`);
      }
    } catch (e) {
      if (e.message.includes("API Key") || e.message.includes("AI Error") || e.message.includes("Quota")) throw e;
    }
    throw new Error(`OpenAI API error (${response.status}): ${errBody}`);
  }

  const result = await response.json();

  const text = result?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Empty response from OpenAI API.");
  }

  // Clean potential markdown fences (OpenAI returns markdown even in JSON mode sometimes)
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  // Basic validation
  if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
    throw new Error("Invalid response: missing transactions array.");
  }

  return parsed;
}
