import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, "expense.json");

let db = { analyses: [], audit_logs: [], api_usage: [] };

export async function initDb() {
  if (fs.existsSync(dbFile)) {
    try {
      db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
      if (!db.audit_logs) db.audit_logs = [];
      if (!db.api_usage) db.api_usage = [];
    } catch (e) {
      console.error("Failed to parse db JSON", e);
    }
  } else {
    saveDb();
  }
}

function saveDb() {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf8");
}

export async function insertAnalysis(analysis) {
  db.analyses.push({
    ...analysis,
    created_at: new Date().toISOString()
  });
  saveDb();
}

export async function getAllAnalyses() {
  return db.analyses
    .map(a => ({
      id: a.id,
      created_at: a.created_at,
      period: a.period,
      bank: a.bank,
      account_holder: a.account_holder,
      total_spent: a.total_spent,
      transaction_count: a.transaction_count,
      is_redacted: a.is_redacted
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getAnalysisById(id) {
  return db.analyses.find(a => a.id === id);
}

export async function updateAnalysis(id, data) {
  const index = db.analyses.findIndex(a => a.id === id);
  if (index !== -1) {
    const totalSpent = (data.transactions || [])
      .filter(t => t.cat !== "Self Transfer")
      .reduce((s, t) => s + t.amount, 0);
      
    db.analyses[index].data = data;
    db.analyses[index].total_spent = totalSpent;
    db.analyses[index].transaction_count = (data.transactions || []).length;
    saveDb();
  }
}

export async function deleteAnalysis(id) {
  db.analyses = db.analyses.filter(a => a.id !== id);
  saveDb();
}

export async function getStats() {
  const total_analyses = db.analyses.length;
  const total_spend_tracked = db.analyses.reduce((sum, a) => sum + (a.total_spent || 0), 0);
  const total_transactions = db.analyses.reduce((sum, a) => sum + (a.transaction_count || 0), 0);
  const avg_transactions = total_analyses > 0 ? total_transactions / total_analyses : 0;
  
  const bankCounts = {};
  db.analyses.forEach(a => {
    if (a.bank) {
      bankCounts[a.bank] = (bankCounts[a.bank] || 0) + 1;
    }
  });
  
  let top_bank = "N/A";
  let maxCount = 0;
  for (const [bank, count] of Object.entries(bankCounts)) {
    if (count > maxCount) {
      maxCount = count;
      top_bank = bank;
    }
  }

  return {
    total_analyses,
    total_spend_tracked,
    avg_transactions: Math.round(avg_transactions),
    total_transactions,
    top_bank
  };
}

// --- AUDIT LOGS ---
export async function insertAuditLog({ action, details, ip }) {
  db.audit_logs.push({
    id: Date.now().toString() + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    action,
    details,
    ip
  });
  saveDb();
}

export async function getAuditLogs(limit = 50, offset = 0) {
  const sorted = [...db.audit_logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return {
    logs: sorted.slice(offset, offset + limit),
    total: sorted.length
  };
}

// --- API USAGE ---
export async function recordApiCall({ success, latency, tokens, error, provider = "gemini" }) {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  // Initialize today if not exists
  let todayRecord = db.api_usage.find(u => u.date === dateStr);
  if (!todayRecord) {
    todayRecord = {
      date: dateStr,
      provider,
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      total_tokens_estimated: 0,
      latencies: [],
      errors: []
    };
    db.api_usage.push(todayRecord);
  }

  todayRecord.total_calls++;
  if (success) {
    todayRecord.successful_calls++;
    todayRecord.latencies.push(latency);
    todayRecord.total_tokens_estimated += (tokens || 0);
  } else {
    todayRecord.failed_calls++;
    todayRecord.errors.push({ time: new Date().toISOString(), message: error });
  }

  // Keep latencies array from growing unbounded per day
  if (todayRecord.latencies.length > 100) {
    todayRecord.latencies.shift(); 
  }

  saveDb();
}

export async function getApiUsage() {
  // Aggregate last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const recentUsage = db.api_usage.filter(u => u.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  
  let totalCalls = 0;
  let successfulCalls = 0;
  let failedCalls = 0;
  let allLatencies = [];
  let totalTokens = 0;

  recentUsage.forEach(u => {
    totalCalls += u.total_calls;
    successfulCalls += u.successful_calls;
    failedCalls += u.failed_calls;
    totalTokens += u.total_tokens_estimated;
    allLatencies.push(...u.latencies);
  });

  const avgLatency = allLatencies.length > 0 ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length : 0;

  return {
    daily: recentUsage,
    aggregate: {
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      total_tokens_estimated: totalTokens,
      avg_latency_ms: Math.round(avgLatency)
    }
  };
}
