import sqlite3 from "sqlite3";
import { open } from "sqlite";
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

let db;

export async function initDb() {
  db = await open({
    filename: path.join(dataDir, "expense.db"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      period TEXT,
      bank TEXT,
      account_holder TEXT,
      total_spent REAL DEFAULT 0,
      transaction_count INTEGER DEFAULT 0,
      data TEXT NOT NULL
    );
  `);
  
  return db;
}

/**
 * Insert a new analysis into the database.
 */
export async function insertAnalysis({ id, period, bank, account_holder, total_spent, transaction_count, data }) {
  const stmt = await db.prepare(`
    INSERT INTO analyses (id, period, bank, account_holder, total_spent, transaction_count, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt.run(id, period, bank, account_holder, total_spent, transaction_count, JSON.stringify(data));
  await stmt.finalize();
}

/**
 * Get all analyses (summary only, no full data blob).
 */
export async function getAllAnalyses() {
  return await db.all(`
    SELECT id, created_at, period, bank, account_holder, total_spent, transaction_count
    FROM analyses
    ORDER BY created_at DESC
  `);
}

/**
 * Get a single analysis by ID (includes full data).
 */
export async function getAnalysisById(id) {
  const row = await db.get("SELECT * FROM analyses WHERE id = ?", id);
  if (row) {
    row.data = JSON.parse(row.data);
  }
  return row;
}

/**
 * Update an analysis (e.g. after category edits).
 */
export async function updateAnalysis(id, data) {
  const totalSpent = (data.transactions || [])
    .filter(t => t.cat !== "Self Transfer")
    .reduce((s, t) => s + t.amount, 0);

  const stmt = await db.prepare(`
    UPDATE analyses
    SET data = ?, total_spent = ?, transaction_count = ?
    WHERE id = ?
  `);
  await stmt.run(JSON.stringify(data), totalSpent, (data.transactions || []).length, id);
  await stmt.finalize();
}

/**
 * Delete an analysis by ID.
 */
export async function deleteAnalysis(id) {
  await db.run("DELETE FROM analyses WHERE id = ?", id);
}

/**
 * Get aggregate stats for admin dashboard.
 */
export async function getStats() {
  const row = await db.get(`
    SELECT
      COUNT(*) as total_analyses,
      COALESCE(SUM(total_spent), 0) as total_spend_tracked,
      COALESCE(AVG(transaction_count), 0) as avg_transactions,
      COALESCE(SUM(transaction_count), 0) as total_transactions
    FROM analyses
  `);

  const topBank = await db.get(`
    SELECT bank, COUNT(*) as cnt
    FROM analyses
    WHERE bank IS NOT NULL
    GROUP BY bank
    ORDER BY cnt DESC
    LIMIT 1
  `);

  return {
    ...row,
    avg_transactions: Math.round(row.avg_transactions || 0),
    top_bank: topBank?.bank || "N/A",
  };
}
