import fetch from "node-fetch";
import { recordApiCall } from "./db.js";

const AI_PROMPT = `You are an expert financial analyst specialising in personal bank statement analysis for Indian users.

The user has uploaded one or more photos or PDF documents of their bank account statement. Your task is to:
1. Carefully read every transaction visible in the provided documents
2. Extract ALL debit/expense transactions (ignore credits/deposits)
3. Categorise each transaction intelligently into one of these categories:
   - Rent, Insurance, Food & Dining, Office Food, Transport, Groceries, Bills & Subscriptions, Personal Transfer, Self Transfer, Entertainment, Shopping, Healthcare, Education, Other
4. Identify the statement period (from/to dates) and bank name if visible
5. Produce a complete spend analysis

IMPORTANT RULES:
- Extract EVERY debit/expense transaction visible — do not skip any
- Look very carefully at the document — it may be a bank account ledger, or a CREDIT CARD statement.
- FOR CREDIT CARDS: Purchases/spends are normal amounts. Payments/refunds usually have "CR" or "Cr" next to them. DO NOT extract entries marked with "CR" or "Cr".
- FOR BANK ACCOUNTS: Debit transactions may be in a dedicated debit/withdrawal column, or have "Dr", "Debit", "Withdrawal", or "-" signs.
- If the statement has a "STATEMENT SUMMARY" box, strictly extract the "Total Credits" / "Payments" / "Deposits" value for the 'total_credits' field, and use the "Purchases/Charges" or total debits for your own reference to ensure you don't over-extract.
- Dates should be in YYYY-MM-DD format; if year is unclear, infer from context
- Amounts should be strictly numeric (no currency symbols or CR/DR suffixes in the JSON)
- Vendor names should be clean and concise (max 40 chars)
- Even if the image quality is poor, try your best to read every line item
- If a page appears to be a continuation, still extract all visible transactions

CATEGORY RULES (VERY IMPORTANT — follow strictly):
- "Self Transfer": ONLY use when money moves between the SAME person's own accounts (e.g., "NEFT to self", "Transfer to own savings", "Fund Transfer to own A/C"). This should be RARE.
- "Personal Transfer": Use for UPI, NEFT, IMPS payments to OTHER people (friends, family, individuals). This includes any payment to a person's name or UPI ID.
- "Food & Dining": Restaurants, Swiggy, Zomato, street food, cafes, bakeries
- "Office Food": Canteen, cafeteria, SmartQ, office cafe
- "Transport": Uber, Ola, Rapido, auto, cab, metro, bus, fuel, petrol, parking
- "Groceries": BigBasket, Blinkit, Zepto, DMart, supermarket, vegetable vendors
- "Bills & Subscriptions": Electricity, water, gas, broadband, Netflix, Spotify, phone recharge, Jio, Airtel, insurance premiums, EMIs
- "Rent": House rent, PG rent, hostel fees
- "Shopping": Amazon, Flipkart, Myntra, clothing, electronics, online purchases
- "Entertainment": Movies, gaming, events, tickets, BookMyShow
- "Healthcare": Hospital, pharmacy, doctor, medical tests, 1mg, PharmEasy
- "Education": Tuition, courses, books, Udemy, college fees
- "Insurance": Life/health/vehicle insurance premiums (separate from Bills)
- "Other": Only if none of the above categories fit

DO NOT put all transactions in the same category. A typical bank statement has a MIX of categories. If you find yourself assigning the same category to most transactions, you are likely wrong — re-examine each transaction individually.

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

CRITICAL: The transactions array MUST NOT be empty if there are any debit entries visible in the statement. Carefully scan every row of data.

Generate 6-8 insights that are specific, data-driven, and genuinely useful. Reference actual amounts and payees from the data. Highlight patterns, anomalies, and actionable observations.`;

// Enhanced retry prompt used when first attempt returns 0 transactions or bad categorization
const RETRY_PROMPT = `IMPORTANT: Your previous analysis had a problem — either 0 transactions were found, or nearly all transactions were assigned to the same category (which is almost always wrong).

Please re-examine the images very carefully:
- Read EVERY line in the statement
- Categorize each transaction INDIVIDUALLY based on the vendor/payee name
- UPI payments to people = "Personal Transfer" (NOT "Self Transfer")
- "Self Transfer" is ONLY for transfers to the same person's OWN accounts
- A normal bank statement should have a diverse MIX of categories

Common vendor patterns:
- Swiggy/Zomato → Food & Dining
- Uber/Ola/Rapido → Transport
- Amazon/Flipkart → Shopping
- Airtel/Jio/Netflix → Bills & Subscriptions
- Payments to people's names → Personal Transfer
- ATM withdrawals → Other
- Canteen/SmartQ → Office Food

` + AI_PROMPT;

const MAX_RETRIES = 2; // Will attempt up to 2 more times if issues detected

// Fallback chain — if one model's quota is exhausted or it fails, try the next
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
];

// Try both API versions — some regions/models only work on one
const API_VERSIONS = ["v1beta", "v1"];

// Proxy URL — if set, Gemini calls go through Vercel Edge (US) instead of direct
const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL || "";
const PROXY_SECRET = process.env.PROXY_SECRET || "";

async function callGeminiModel(modelName, apiKey, imageParts, promptText, temperature, apiVersion = "v1beta") {
  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          ...imageParts,
        ],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: 65536,
      responseMimeType: "application/json",
    },
  };

  let response;

  if (GEMINI_PROXY_URL) {
    // Route through Vercel Edge proxy (US region) to bypass location restrictions
    console.log(`[Gemini] Using proxy: ${GEMINI_PROXY_URL}`);
    response = await fetch(GEMINI_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Token": PROXY_SECRET,
      },
      body: JSON.stringify({ modelName, apiVersion, payload }),
    });
  } else {
    // Direct call to Google API
    const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const errBody = await response.text();
    let errorMessage = `Gemini API error (${response.status}): ${errBody}`;
    try {
      const parsedBody = JSON.parse(errBody);
      if (parsedBody?.error?.message) {
        errorMessage = parsedBody.error.message;
      }
    } catch (_) {}

    const err = new Error(errorMessage);
    err.status = response.status;
    err.isQuotaError = errorMessage.toLowerCase().includes("quota") || response.status === 429;
    err.isNotFoundError = response.status === 404;
    err.isLocationError = errorMessage.toLowerCase().includes("user location is not supported") || errorMessage.toLowerCase().includes("location is not supported");
    throw err;
  }

  return await response.json();
}

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

  console.log(`[Gemini] Analyzing ${files.length} file(s): ${files.map(f => `${f.originalname} (${f.mimetype}, ${Math.round(f.buffer.length/1024)}KB)`).join(", ")}`);

  const startTime = Date.now();
  let success = false;
  let tokensEst = files.reduce((acc, f) => acc + Math.ceil(f.buffer.length / 1000), 1000);
  let errorMsg = null;
  let usedModel = MODEL_CHAIN[0];

  let sawLocationError = false;

  try {
    // Try each model in the fallback chain until one works
    for (let modelIdx = 0; modelIdx < MODEL_CHAIN.length; modelIdx++) {
      usedModel = MODEL_CHAIN[modelIdx];
      let attempt = 0;

      try {
        // Try each API version for this model (v1beta, v1) to work around region restrictions
        let lastVersionError = null;
        let versionSuccess = false;

        for (const apiVersion of API_VERSIONS) {
          attempt = 0;
          try {
            while (attempt <= MAX_RETRIES) {
              const promptText = attempt === 0 ? AI_PROMPT : RETRY_PROMPT;
              const temperature = attempt === 0 ? 0.1 : 0.2 + (attempt * 0.1);

              console.log(`[Gemini] Model: ${usedModel} (${apiVersion}) | Attempt ${attempt + 1}/${MAX_RETRIES + 1} (temp: ${temperature})`);

              const result = await callGeminiModel(usedModel, apiKey, imageParts, promptText, temperature, apiVersion);
              
              // Safety check for empty candidates (often due to safety filters)
              if (!result?.candidates?.[0]?.content?.parts?.[0]?.text) {
                console.error(`[Gemini] ${usedModel} returned empty response or candidate. Full response:`, JSON.stringify(result));
                throw new Error(`Empty response from ${usedModel}`);
              }

              const text = result.candidates[0].content.parts[0].text;

              const cleaned = text
                .replace(/```json\s*/gi, "")
                .replace(/```\s*/gi, "")
                .trim();

              let parsed;
              try {
                parsed = JSON.parse(cleaned);
              } catch (e) {
                console.error(`[Gemini] Attempt ${attempt + 1} returned invalid JSON:`, text.substring(0, 200));
                if (attempt < MAX_RETRIES) {
                  attempt++;
                  console.log(`[Gemini] Retrying due to invalid JSON...`);
                  continue;
                }
                throw new Error("AI returned invalid JSON. Please try again.");
              }

              if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
                console.error(`[Gemini] Attempt ${attempt + 1} missing transactions array`);
                if (attempt < MAX_RETRIES) {
                  attempt++;
                  continue;
                }
                throw new Error("Invalid response format: missing transactions array.");
              }

              // If we got 0 transactions, retry with enhanced prompt
              if (parsed.transactions.length === 0 && attempt < MAX_RETRIES) {
                console.warn(`[Gemini] Attempt ${attempt + 1} returned 0 transactions — retrying with enhanced prompt...`);
                attempt++;
                continue;
              }

              // Detect misclassification: if 100% of transactions share the same category, retry
              if (parsed.transactions.length >= 5 && attempt < MAX_RETRIES) {
                const catCounts = {};
                parsed.transactions.forEach(t => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });
                const maxCatCount = Math.max(...Object.values(catCounts));
                const dominantCat = Object.keys(catCounts).find(k => catCounts[k] === maxCatCount);
                const ratio = maxCatCount / parsed.transactions.length;
                if (ratio >= 1.0 && dominantCat !== "Other") {
                  console.warn(`[Gemini] Attempt ${attempt + 1}: 100% of transactions are "${dominantCat}" — likely misclassified, retrying...`);
                  attempt++;
                  continue;
                }
              }

              // Final safety net: auto-fix categories if still dominated by one category
              parsed.transactions = fixMisclassifiedCategories(parsed.transactions);

              console.log(`[Gemini] ✅ Success with ${usedModel} (${apiVersion}) on attempt ${attempt + 1}: ${parsed.transactions.length} transactions extracted`);
              success = true;
              return parsed;
            }

            // All retries exhausted for this model+version but no fatal error — break out of version loop
            throw new Error("Failed to extract transactions after multiple attempts.");

          } catch (versionError) {
            lastVersionError = versionError;
            // If location error, try the next API version
            if (versionError.isLocationError) {
              sawLocationError = true;
              console.warn(`[Gemini] ⚠️ Location restricted on ${usedModel} (${apiVersion}) — trying next API version...`);
              continue;
            }
            // If quota/404/empty, break out and try next model
            if (versionError.isQuotaError || versionError.isNotFoundError || versionError.message.includes("Empty response")) {
              break;
            }
            // For other errors (bad JSON, missing transactions after all retries), stop
            throw versionError;
          }
        }

        // If we get here, all API versions failed for this model
        if (lastVersionError) throw lastVersionError;

      } catch (modelError) {
        // If it's a recoverable error and we have more models to try, fall back
        const canFallback = modelIdx < MODEL_CHAIN.length - 1;
        const isTemporaryError = modelError.isQuotaError || modelError.message.includes("Empty response") || modelError.isNotFoundError || modelError.isLocationError;

        if (isTemporaryError && canFallback) {
          console.warn(`[Gemini] ⚠️ ${modelError.message} for ${usedModel} — falling back to ${MODEL_CHAIN[modelIdx + 1]}...`);
          continue;
        }
        // Last model with temporary error — fall through to post-loop check
        if (isTemporaryError && !canFallback) {
          break;
        }
        // Non-temporary error — re-throw
        throw modelError;
      }
    }

    // If we exhausted all models and the last error was a location error, give a specific message
    if (sawLocationError) {
      throw new Error("User location is not supported for the API use. The server's region is restricted by Google. Please redeploy the backend to a supported region (e.g. US) or enable billing on your Google AI project.");
    }
    throw new Error("All Gemini models exhausted or failed. Please try again later.");
  } catch (error) {
    errorMsg = error.message;
    throw error;
  } finally {
    const latency = Date.now() - startTime;
    try {
      await recordApiCall({ success, latency, tokens: tokensEst, error: errorMsg, provider: `gemini:${usedModel}` });
    } catch (logErr) {
      console.error("[Gemini] Failed to record API call:", logErr.message);
    }
  }
}

/**
 * Auto-fix misclassified transactions using keyword matching on descriptions.
 * This runs as a safety net when the AI persistently assigns wrong categories.
 */
function fixMisclassifiedCategories(transactions) {
  // Check if categories are dominated by one value
  const catCounts = {};
  transactions.forEach(t => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });
  const maxCount = Math.max(...Object.values(catCounts));
  const ratio = maxCount / transactions.length;

  // Only auto-fix if >70% are in the same category (sign of misclassification)
  if (ratio <= 0.7 || transactions.length < 3) return transactions;

  console.log(`[Gemini] ⚠️ Auto-fixing categories (${Math.round(ratio * 100)}% in one category)...`);

  const KEYWORD_RULES = [
    // Food & Dining
    { keywords: ["swiggy", "zomato", "restaurant", "cafe", "pizza", "burger", "dominos", "mcdonald", "kfc", "subway", "biryani", "food", "dining", "eat", "hotel", "dhaba", "bakery", "tea", "coffee", "starbucks", "chaayos"], cat: "Food & Dining" },
    // Office Food
    { keywords: ["canteen", "cafeteria", "smartq", "office food", "mess", "tiffin"], cat: "Office Food" },
    // Transport
    { keywords: ["uber", "ola", "rapido", "auto", "cab", "metro", "bus", "fuel", "petrol", "diesel", "parking", "toll", "irctc", "railway", "train", "flight", "makemytrip", "redbus", "fastag"], cat: "Transport" },
    // Groceries
    { keywords: ["bigbasket", "blinkit", "zepto", "dmart", "supermarket", "grocery", "vegetable", "kirana", "jiomart", "more", "reliance fresh", "nature basket", "grofers", "instamart"], cat: "Groceries" },
    // Bills & Subscriptions
    { keywords: ["airtel", "jio", "vodafone", "vi ", "bsnl", "netflix", "spotify", "amazon prime", "hotstar", "disney", "youtube", "electricity", "bescom", "water", "gas", "broadband", "wifi", "internet", "recharge", "prepaid", "postpaid", "emi", "loan", "premium"], cat: "Bills & Subscriptions" },
    // Shopping
    { keywords: ["amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "croma", "reliance digital", "decathlon", "ikea", "shopping", "store", "mall", "purchase"], cat: "Shopping" },
    // Entertainment
    { keywords: ["bookmyshow", "movie", "cinema", "pvr", "inox", "game", "gaming", "dream11", "spotify", "concert", "event", "ticket"], cat: "Entertainment" },
    // Healthcare
    { keywords: ["hospital", "pharmacy", "pharmeasy", "1mg", "netmeds", "apollo", "doctor", "clinic", "medical", "lab", "diagnostic", "health"], cat: "Healthcare" },
    // Education
    { keywords: ["university", "college", "school", "tuition", "udemy", "coursera", "course", "education", "exam", "book"], cat: "Education" },
    // Rent
    { keywords: ["rent", "pg ", "hostel", "accommodation", "landlord", "house rent"], cat: "Rent" },
    // Insurance
    { keywords: ["insurance", "lic", "hdfc life", "icici prudential", "sbi life", "policy"], cat: "Insurance" },
    // Self Transfer (strict — only if it's explicitly self)
    { keywords: ["self", "own account", "own a/c", "fund transfer to self", "neft to self"], cat: "Self Transfer" },
  ];

  let fixed = 0;
  return transactions.map(t => {
    const desc = (t.desc || "").toLowerCase();

    // Try to match keywords
    for (const rule of KEYWORD_RULES) {
      if (rule.keywords.some(kw => desc.includes(kw))) {
        if (t.cat !== rule.cat) {
          fixed++;
          console.log(`[AutoFix] "${t.desc}" : ${t.cat} → ${rule.cat}`);
        }
        return { ...t, cat: rule.cat };
      }
    }

    // If no keyword match and currently "Self Transfer", change to "Personal Transfer" (UPI to people is most common)
    if (t.cat === "Self Transfer") {
      fixed++;
      console.log(`[AutoFix] "${t.desc}" : Self Transfer → Personal Transfer`);
      return { ...t, cat: "Personal Transfer" };
    }

    // If no keyword match and currently the dominant category, change to "Other"
    const dominantCat = Object.keys(catCounts).find(k => catCounts[k] === maxCount);
    if (t.cat === dominantCat) {
      fixed++;
      return { ...t, cat: "Other" };
    }

    return t;
  });
}

