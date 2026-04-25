import mongoose from "mongoose";

// ────────────────────────────── Schemas ──────────────────────────────

const analysisSchema = new mongoose.Schema({
  id:                { type: String, required: true, unique: true },
  period:            String,
  bank:              String,
  account_holder:    String,
  total_spent:       Number,
  transaction_count: Number,
  is_redacted:       Boolean,
  data:              mongoose.Schema.Types.Mixed,   // full transaction payload
  created_at:        { type: Date, default: Date.now }
});

const auditLogSchema = new mongoose.Schema({
  id:        { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  action:    String,
  details:   String,
  ip:        String
});

const apiUsageSchema = new mongoose.Schema({
  date:                   { type: String, required: true, unique: true },
  provider:               { type: String, default: "gemini" },
  total_calls:            { type: Number, default: 0 },
  successful_calls:       { type: Number, default: 0 },
  failed_calls:           { type: Number, default: 0 },
  total_tokens_estimated: { type: Number, default: 0 },
  latencies:              { type: [Number], default: [] },
  errors:                 { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { suppressReservedKeysWarning: true });

const Analysis = mongoose.model("Analysis", analysisSchema);
const AuditLog = mongoose.model("AuditLog", auditLogSchema);
const ApiUsage = mongoose.model("ApiUsage", apiUsageSchema);

// ────────────────────────────── Init ──────────────────────────────

export async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("⚠️  MONGODB_URI not set – database will NOT persist!");
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}

// ────────────────────────── Analyses ──────────────────────────

export async function insertAnalysis(analysis) {
  await Analysis.create({
    ...analysis,
    created_at: new Date()
  });
}

export async function getAllAnalyses() {
  const docs = await Analysis.find({})
    .select("id created_at period bank account_holder total_spent transaction_count is_redacted")
    .sort({ created_at: -1 })
    .lean();

  return docs.map(a => ({
    id: a.id,
    created_at: a.created_at,
    period: a.period,
    bank: a.bank,
    account_holder: a.account_holder,
    total_spent: a.total_spent,
    transaction_count: a.transaction_count,
    is_redacted: a.is_redacted
  }));
}

export async function getAnalysisById(id) {
  return Analysis.findOne({ id }).lean();
}

export async function updateAnalysis(id, data) {
  const totalSpent = (data.transactions || [])
    .filter(t => t.cat !== "Self Transfer")
    .reduce((s, t) => s + t.amount, 0);

  await Analysis.updateOne({ id }, {
    $set: {
      data,
      total_spent: totalSpent,
      transaction_count: (data.transactions || []).length
    }
  });
}

export async function deleteAnalysis(id) {
  await Analysis.deleteOne({ id });
}

export async function getStats() {
  const analyses = await Analysis.find({})
    .select("total_spent transaction_count bank")
    .lean();

  const total_analyses = analyses.length;
  const total_spend_tracked = analyses.reduce((sum, a) => sum + (a.total_spent || 0), 0);
  const total_transactions = analyses.reduce((sum, a) => sum + (a.transaction_count || 0), 0);
  const avg_transactions = total_analyses > 0 ? total_transactions / total_analyses : 0;

  const bankCounts = {};
  analyses.forEach(a => {
    if (a.bank) bankCounts[a.bank] = (bankCounts[a.bank] || 0) + 1;
  });

  let top_bank = "N/A";
  let maxCount = 0;
  for (const [bank, count] of Object.entries(bankCounts)) {
    if (count > maxCount) { maxCount = count; top_bank = bank; }
  }

  return {
    total_analyses,
    total_spend_tracked,
    avg_transactions: Math.round(avg_transactions),
    total_transactions,
    top_bank
  };
}

// ────────────────────────── Audit Logs ──────────────────────────

export async function insertAuditLog({ action, details, ip }) {
  await AuditLog.create({
    id: Date.now().toString() + Math.floor(Math.random() * 1000),
    timestamp: new Date(),
    action,
    details,
    ip
  });
}

export async function getAuditLogs(limit = 50, offset = 0) {
  const [logs, total] = await Promise.all([
    AuditLog.find({}).sort({ timestamp: -1 }).skip(offset).limit(limit).lean(),
    AuditLog.countDocuments()
  ]);
  return { logs, total };
}

// ────────────────────────── API Usage ──────────────────────────

export async function recordApiCall({ success, latency, tokens, error, provider = "gemini" }) {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Upsert today's record
  const update = {
    $inc: {
      total_calls: 1,
      ...(success ? { successful_calls: 1 } : { failed_calls: 1 }),
      ...(success ? { total_tokens_estimated: tokens || 0 } : {})
    },
    $setOnInsert: { date: dateStr, provider }
  };

  if (success) {
    update.$push = { latencies: { $each: [latency], $slice: -100 } };
  } else {
    update.$push = { errors: { $each: [{ time: new Date().toISOString(), message: error }], $slice: -50 } };
  }

  await ApiUsage.updateOne({ date: dateStr }, update, { upsert: true });
}

export async function getApiUsage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const recentUsage = await ApiUsage.find({ date: { $gte: cutoff } }).sort({ date: 1 }).lean();

  let totalCalls = 0, successfulCalls = 0, failedCalls = 0, totalTokens = 0;
  const allLatencies = [];

  recentUsage.forEach(u => {
    totalCalls += u.total_calls;
    successfulCalls += u.successful_calls;
    failedCalls += u.failed_calls;
    totalTokens += u.total_tokens_estimated;
    allLatencies.push(...u.latencies);
  });

  const avgLatency = allLatencies.length > 0
    ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
    : 0;

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
