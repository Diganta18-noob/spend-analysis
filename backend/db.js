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

let db = { analyses: [] };

export async function initDb() {
  if (fs.existsSync(dbFile)) {
    try {
      db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
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
      transaction_count: a.transaction_count
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
