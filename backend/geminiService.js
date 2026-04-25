import fetch from "node-fetch";

const AI_PROMPT = `You are an expert financial analyst specialising in personal bank statement analysis for Indian users.

The user has uploaded one or more photos or PDF documents of their bank account statement. Your task is to:
1. Carefully read every transaction visible in the provided documents
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

export async function analyzeStatementsServer(files) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey === "") {
    throw new Error("Missing Gemini API key. Please check your .env file.");
  }

  // Convert uploaded files to Gemini parts
  const imageParts = files.map((file) => {
    return {
      inline_data: {
        mime_type: file.mimetype,
        data: file.buffer.toString("base64"),
      },
    };
  });

  const payload = {
    contents: [
      {
        parts: [
          { text: AI_PROMPT },
          ...imageParts,
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    try {
      const parsedBody = JSON.parse(errBody);
      if (parsedBody?.error?.message) {
        throw new Error(`Gemini Error: ${parsedBody.error.message}`);
      }
    } catch (e) {
      if (e.message.includes("Gemini Error")) throw e;
    }
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Empty response from Gemini API.");
  }

  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error("Invalid response format: missing transactions array.");
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}
