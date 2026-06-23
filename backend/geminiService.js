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
- FOR CREDIT CARDS: Purchases/spends are normal amounts. Payments/refunds usually have "CR" or "Cr" next to them. DO NOT extract card payment/credit transactions (e.g., descriptions containing "Payment received", "Mobile Banking Payment", "Internet Banking Payment", "Auto-payment", "BBPS Payment", or any transaction representing payment of the credit card bill). However, merchant refunds or purchase reversals (which have "CR" or "Cr" next to the amount, e.g. from merchants like Amazon, Swiggy, etc.) SHOULD be extracted. Represent the amount for these refunds as a negative number (e.g. -2089.00 for "2,089.00 CR") and extract their negative reward points (e.g., -104).
- FOR BANK ACCOUNTS: Debit transactions may be in a dedicated debit/withdrawal column, or have "Dr", "Debit", "Withdrawal", or "-" signs.
- If the statement has a "STATEMENT SUMMARY" box, strictly extract the "Total Credits" / "Payments" / "Deposits" value for the 'total_credits' field, and use the "Purchases/Charges" or total debits for your own reference to ensure you don't over-extract.
- REWARD POINTS: Many credit card statements have a "Reward Points" or "Points Earned" column next to each transaction. If you see such a column, extract the reward points for EACH transaction into the "reward_points" field (integer). Negative reward points (e.g., -104 for refunds) should be preserved as negative numbers. If no reward points column is visible, set "reward_points" to null for all transactions. Also compute "total_reward_points" as the sum of all extracted reward points.
- Dates should be in YYYY-MM-DD format; if year is unclear, infer from context. Ensure absolute accuracy for dates and check for common OCR misreads (e.g., do not misread 29 as 23, or 08 as 03).
- Amounts should be strictly numeric (no currency symbols or CR/DR suffixes in the JSON). Keep decimals exactly as they appear in the statement (e.g., 723.20 must be 723.2, 272.58 must be 272.58). Do not round or drop decimal places!
- ACCURACY & DEDUPLICATION: If multiple transactions have the same amount and description but occur on different dates or have different reference numbers, they are distinct transactions and you MUST extract all of them. Do not deduplicate them!
- PAGE BOUNDARIES: Check reference/transaction numbers. If a transaction at the bottom of one page is printed again at the top of the next page with the exact same date, description, reference number, and amount, it is a page boundary duplicate and must be extracted only once. But if the reference number or date is different, they are separate transactions.
- SELF-VERIFICATION: Before producing the final output, sum up all transaction amounts you have extracted. If the statement has a "Purchases / Charges" or "Total Debits" total in the summary box, compare your sum to that total. If they do not match, re-scan the pages to find the discrepancy (missed transaction or incorrect amount) and fix it.
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
  "total_reward_points": 315,
  "transactions": [
    {
      "date": "2026-04-02",
      "desc": "SmartQ Canteen",
      "amount": 64.00,
      "cat": "Office Food",
      "reward_points": 3
    },
    {
      "date": "2026-04-03",
      "desc": "Amazon Pay IN E COMMERC (Refund)",
      "amount": -2089.00,
      "cat": "Shopping",
      "reward_points": -104
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

export const PAGE_EXTRACTION_PROMPT = `You are an expert financial analyst specialising in bank statement OCR and transaction extraction. Read the bank statement image and extract ALL debit/expense transactions.
Do NOT skip any visible debit entries. For credit card statements, reverse transactions or merchant refunds (ending in CR/Cr) should be extracted as negative amounts.
Exclude credit card payments or bill payments.
Extract bank name and statement period if visible.
Respond ONLY with a valid JSON object — no markdown, no code fences, no preamble. The structure must be:
{
  "bank": "Bank name if visible or null",
  "account_holder": "Name if visible or null",
  "period": "Period string if visible or null",
  "opening_balance": 123.45,
  "closing_balance": 123.45,
  "total_credits": 123.45,
  "total_reward_points": 100,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "desc": "Merchant/Payee name",
      "amount": 100.00,
      "cat": "Category name",
      "reward_points": 10
    }
  ]
}
Category list: Rent, Insurance, Food & Dining, Office Food, Transport, Groceries, Bills & Subscriptions, Personal Transfer, Self Transfer, Entertainment, Shopping, Healthcare, Education, Other`;

export const GLOBAL_INSIGHTS_PROMPT = `You are an expert financial analyst. Read the transaction list provided in JSON format and generate exactly 6-8 specific, data-driven, and genuinely useful spend insights.
Respond ONLY with a valid JSON object — no markdown, no code fences, no preamble. The structure must be:
{
  "insights": [
    {
      "icon": "emoji here",
      "title": "Short insight title",
      "body": "2-3 sentence detailed observation with specific amounts, dates, and trends based on the transactions list",
      "badge": "Fixed|Variable|Pattern|Spike|Review|Planned|Low|High",
      "color": "#hex color"
    }
  ]
}
Transactions:
`;

// Fallback chain — prioritize gemini-2.5-flash
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
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

  const payloadJson = JSON.stringify(payload);
  const proxyPayloadJson = GEMINI_PROXY_URL ? JSON.stringify({ modelName, apiVersion, payload }) : null;

  // Estimate payload size for logging
  const payloadSizeMB = (proxyPayloadJson || payloadJson).length / (1024 * 1024);
  console.log(`[Gemini] Payload size: ${payloadSizeMB.toFixed(2)}MB`);

  let response;
  let usedProxy = false;
  let responseText = null;

  if (GEMINI_PROXY_URL) {
    // Route through Vercel proxy (US region) to bypass location restrictions
    console.log(`[Gemini] Using proxy: ${GEMINI_PROXY_URL}`);
    try {
      response = await fetch(GEMINI_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Proxy-Token": PROXY_SECRET,
        },
        body: proxyPayloadJson,
      });
      usedProxy = true;

      // Detect Vercel infrastructure errors (FUNCTION_INVOCATION_FAILED, 502, 503, 504)
      // These mean the proxy itself crashed, NOT that the Gemini API returned an error.
      // Fall back to direct API call in these cases.
      if (!response.ok && response.status >= 500) {
        const errBody = await response.text();
        const isProxyCrash = errBody.includes("FUNCTION_INVOCATION_FAILED") ||
                             errBody.includes("FUNCTION_INVOCATION_TIMEOUT") ||
                             errBody.includes("An error occurred") ||
                             errBody.includes("EDGE_FUNCTION_INVOCATION") ||
                             response.status === 502 || response.status === 503 ||
                             response.status === 504;

        if (isProxyCrash) {
          console.warn(`[Gemini] ⚠️ Proxy crashed (${response.status}): ${errBody.substring(0, 200)}`);
          console.log(`[Gemini] Falling back to direct Gemini API call...`);
          response = null; // Clear to trigger direct call below
          usedProxy = false;
        } else {
          // Store the read body so we don't try to read it again on line 196
          responseText = errBody;
        }
      }
    } catch (proxyFetchError) {
      // Network error reaching the proxy (DNS failure, connection refused, etc.)
      console.warn(`[Gemini] ⚠️ Proxy unreachable: ${proxyFetchError.message}`);
      console.log(`[Gemini] Falling back to direct Gemini API call...`);
      response = null;
      usedProxy = false;
    }
  }

  // Direct call to Google API (primary path when no proxy, or fallback when proxy fails)
  if (!response) {
    const apiBase = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
    const endpoint = `${apiBase}/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;
    console.log(`[Gemini] Calling Gemini API directly: ${modelName} (${apiVersion})`);
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payloadJson,
    });
  }

  if (!response.ok) {
    const errBody = responseText !== null ? responseText : await response.text();
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
    err.isTimeoutError = response.status === 504 || response.status === 408 || errorMessage.toLowerCase().includes("timeout") || errorMessage.toLowerCase().includes("took too long");
    throw err;
  }

  return await response.json();
}

export async function analyzeStatementsServer(files, prompt = AI_PROMPT) {
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
              const promptText = attempt === 0 ? prompt : RETRY_PROMPT;
              const temperature = attempt === 0 ? 0.1 : 0.2 + (attempt * 0.1);

              console.log(`[Gemini] Model: ${usedModel} (${apiVersion}) | Attempt ${attempt + 1}/${MAX_RETRIES + 1} (temp: ${temperature})`);

              const attemptStartTime = Date.now();
              try {
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
                  throw new Error("AI returned invalid JSON. Please try again.");
                }

                if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
                  console.error(`[Gemini] Attempt ${attempt + 1} missing transactions array`);
                  throw new Error("Invalid response format: missing transactions array.");
                }

                // If we got 0 transactions, retry with enhanced prompt
                if (parsed.transactions.length === 0 && attempt < MAX_RETRIES) {
                  console.warn(`[Gemini] Attempt ${attempt + 1} returned 0 transactions — retrying with enhanced prompt...`);
                  throw new Error("AI returned 0 transactions. Please try again.");
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
                    throw new Error(`AI misclassified all transactions into "${dominantCat}". Please try again.`);
                  }
                }

                // Final safety net: auto-fix categories if still dominated by one category
                parsed.transactions = fixMisclassifiedCategories(parsed.transactions);

                console.log(`[Gemini] ✅ Success with ${usedModel} (${apiVersion}) on attempt ${attempt + 1}: ${parsed.transactions.length} transactions extracted`);
                
                // Record success for this attempt
                const latency = Date.now() - attemptStartTime;
                try {
                  await recordApiCall({ success: true, latency, tokens: tokensEst, provider: `gemini:${usedModel}` });
                } catch (logErr) {
                  console.error("[Gemini] Failed to record API call:", logErr.message);
                }

                success = true;
                return parsed;
              } catch (attemptError) {
                // Record failure for this attempt
                const latency = Date.now() - attemptStartTime;
                try {
                  await recordApiCall({ success: false, latency, tokens: tokensEst, error: attemptError.message, provider: `gemini:${usedModel}` });
                } catch (logErr) {
                  console.error("[Gemini] Failed to record API call:", logErr.message);
                }

                const isRetryable = attemptError.message.includes("invalid JSON") || 
                                    attemptError.message.includes("missing transactions") || 
                                    attemptError.message.includes("0 transactions") || 
                                    attemptError.message.includes("misclassified");

                if (isRetryable && attempt < MAX_RETRIES) {
                  attempt++;
                  console.log(`[Gemini] Retrying...`);
                  continue;
                }
                throw attemptError;
              }
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
            
            // Check for timeout
            const isTimeoutError = versionError.isTimeoutError ||
                                   versionError.status === 504 || 
                                   versionError.status === 408 || 
                                   (versionError.message && versionError.message.toLowerCase().includes("took too long")) ||
                                   (versionError.message && versionError.message.toLowerCase().includes("timeout"));

            // If quota/404/empty/timeout, break out and try next model
            if (versionError.isQuotaError || versionError.isNotFoundError || (versionError.message && versionError.message.includes("Empty response")) || isTimeoutError) {
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
        const isTimeout = modelError.status === 504 || 
                          modelError.status === 408 || 
                          (modelError.message && modelError.message.toLowerCase().includes("took too long")) ||
                          (modelError.message && modelError.message.toLowerCase().includes("timeout"));

        const isTemporaryError = modelError.isQuotaError || 
                                 (modelError.message && modelError.message.includes("Empty response")) || 
                                 modelError.isNotFoundError || 
                                 modelError.isLocationError || 
                                 isTimeout;

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
    throw error;
  }
}

/**
 * Auto-fix misclassified transactions using keyword matching on descriptions.
 * This runs as a safety net when the AI persistently assigns wrong categories.
 */
function fixMisclassifiedCategories(transactions) {
  const KEYWORD_RULES = [
    // Food & Dining
    { keywords: ["swiggy", "zomato", "restaurant", "cafe", "pizza", "burger", "domino", "mcdonald", "kfc", "subway", "biryani", "food", "dining", "eat", "hotel", "dhaba", "bakery", "tea", "coffee", "starbucks", "chaayos"], cat: "Food & Dining" },
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

  // 1. Always apply high-confidence keyword rules first
  let updatedTransactions = transactions.map(t => {
    const desc = (t.desc || "").toLowerCase();
    for (const rule of KEYWORD_RULES) {
      if (rule.keywords.some(kw => desc.includes(kw))) {
        if (t.cat !== rule.cat) {
          console.log(`[AutoFix Keyword] "${t.desc}" : ${t.cat} → ${rule.cat}`);
        }
        return { ...t, cat: rule.cat };
      }
    }
    return t;
  });

  // Check if categories are dominated by one value
  const catCounts = {};
  updatedTransactions.forEach(t => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });
  const maxCount = Math.max(...Object.values(catCounts));
  const ratio = maxCount / updatedTransactions.length;

  // Only auto-fix dominant category or self-transfer fallback if >70% are in the same category
  if (ratio <= 0.7 || updatedTransactions.length < 3) {
    return updatedTransactions;
  }

  console.log(`[Gemini] ⚠️ Auto-fixing dominant category (${Math.round(ratio * 100)}% in one category)...`);

  const dominantCat = Object.keys(catCounts).find(k => catCounts[k] === maxCount);

  return updatedTransactions.map(t => {
    const desc = (t.desc || "").toLowerCase();
    // Skip if it matched a keyword rule (i.e. it was already handled or updated)
    const matchedKeyword = KEYWORD_RULES.some(rule => rule.keywords.some(kw => desc.includes(kw)));
    if (matchedKeyword) return t;

    // If no keyword match and currently "Self Transfer", change to "Personal Transfer" (UPI to people is most common)
    if (t.cat === "Self Transfer") {
      console.log(`[AutoFix Fallback] "${t.desc}" : Self Transfer → Personal Transfer`);
      return { ...t, cat: "Personal Transfer" };
    }

    // If no keyword match and currently the dominant category, change to "Other"
    if (t.cat === dominantCat) {
      console.log(`[AutoFix Fallback] "${t.desc}" : ${t.cat} → Other`);
      return { ...t, cat: "Other" };
    }

    return t;
  });
}

