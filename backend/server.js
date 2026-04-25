import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { PDFDocument } from "pdf-lib";
import * as mupdf from "mupdf";
import { analyzeStatementsServer } from "./geminiService.js";
import { redactPII } from "./piiRedactor.js";
import {
  initDb, insertAnalysis, getAllAnalyses, getAnalysisById,
  updateAnalysis, deleteAnalysis, getStats,
  insertAuditLog, getAuditLogs,
  getApiUsage
} from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Configure multer for file uploads (in-memory buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

// Helper to get client IP
function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

// Middleware for simple admin auth
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};


// --- PDF Decryption Helper ---
async function tryDecryptPdf(fileBuffer, password) {
  try {
    const cleanPassword = (password || "").trim();
    console.log("Attempting to decrypt with mupdf, password:", cleanPassword);
    
    // Load document using mupdf
    const doc = mupdf.Document.openDocument(fileBuffer, "application/pdf");
    
    if (doc.needsPassword()) {
      if (!cleanPassword) {
        throw new Error("Incorrect password");
      }
      const ok = doc.authenticatePassword(cleanPassword);
      if (!ok) {
        throw new Error("Incorrect password");
      }
    }
    
    // Save to unencrypted buffer
    if (doc.saveToBuffer) {
      const mupdfBuf = doc.saveToBuffer(""); // empty options strips encryption
      const uint8Array = mupdfBuf.asUint8Array();
      console.log("Decryption successful!");
      return Buffer.from(uint8Array);
    } else {
      throw new Error("Not a valid PDF document for saving");
    }
  } catch (err) {
    console.error("PDF Decryption Error:", err.message);
    if (err.message?.includes("not encrypted")) {
      throw err;
    }
    if (err.message?.includes("Incorrect password")) {
      return null; // Signal: wrong password
    }
    // Not a password issue, or it's an unsupported encryption — re-throw
    throw err;
  }
}

// --- ROUTES ---

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  const { password } = req.body;
  const ip = getClientIp(req);
  if (password === ADMIN_PASSWORD) {
    await insertAuditLog({ action: "ADMIN_LOGIN", details: "Admin logged in successfully", ip });
    res.json({ token: ADMIN_PASSWORD });
  } else {
    await insertAuditLog({ action: "ADMIN_LOGIN_FAILED", details: "Failed login attempt", ip });
    res.status(401).json({ error: "Invalid password" });
  }
});

// Change admin password
app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ip = getClientIp(req);
  if (currentPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect current password" });
  }
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters" });
  }

  // Update in memory
  ADMIN_PASSWORD = newPassword;

  // Update .env file
  try {
    const envPath = path.join(__dirname, ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }
    
    if (envContent.includes("ADMIN_PASSWORD=")) {
      envContent = envContent.replace(/ADMIN_PASSWORD=.*/g, `ADMIN_PASSWORD=${newPassword}`);
    } else {
      envContent += `\nADMIN_PASSWORD=${newPassword}\n`;
    }
    
    fs.writeFileSync(envPath, envContent.trim() + "\n", "utf8");
    await insertAuditLog({ action: "PASSWORD_CHANGED", details: "Admin password was changed", ip });
    res.json({ success: true, token: newPassword });
  } catch (err) {
    console.error("Failed to write to .env:", err);
    await insertAuditLog({ action: "PASSWORD_CHANGED", details: "Admin password changed (could not persist to .env)", ip });
    res.json({ success: true, token: newPassword, warning: "Could not persist to .env file" });
  }
});

// Analyze new statements
app.post("/api/analyze", upload.array("files", 10), async (req, res) => {
  const ip = getClientIp(req);
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // --- PDF Password Handling ---
    let pdfPasswords = {};
    try {
      if (req.body.pdfPasswords) {
        pdfPasswords = JSON.parse(req.body.pdfPasswords);
      }
    } catch (e) { /* ignore parse errors */ }

    const processedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      if (file.mimetype === "application/pdf") {
        // Try loading without password first
        try {
          await PDFDocument.load(file.buffer, { ignoreEncryption: false });
          // Loaded fine — not encrypted
          processedFiles.push(file);
        } catch (loadErr) {
          // Likely encrypted — try with provided password
          const password = pdfPasswords[file.originalname] || pdfPasswords[`file_${i}`];
          if (!password) {
            return res.status(400).json({
              error: "PDF_PASSWORD_REQUIRED",
              message: `The file "${file.originalname}" is password-protected. Please provide the password.`,
              fileName: file.originalname,
              fileIndex: i,
            });
          }

          const decryptedBuffer = await tryDecryptPdf(file.buffer, password);
          if (!decryptedBuffer) {
            return res.status(400).json({
              error: "PDF_PASSWORD_INCORRECT",
              message: `Incorrect password for "${file.originalname}". Please try again.`,
              fileName: file.originalname,
              fileIndex: i,
            });
          }

          processedFiles.push({
            ...file,
            buffer: decryptedBuffer,
          });
        }
      } else {
        processedFiles.push(file);
      }
    }

    const data = await analyzeStatementsServer(processedFiles);

    const id = uuidv4();
    const totalSpent = (data.transactions || [])
      .filter(t => t.cat !== "Self Transfer")
      .reduce((s, t) => s + t.amount, 0);

    // Redact PII before saving to database
    const redactedData = redactPII(data);

    await insertAnalysis({
      id,
      period: data.period,
      bank: data.bank,
      account_holder: redactedData.account_holder, // Store redacted name
      total_spent: totalSpent,
      transaction_count: (data.transactions || []).length,
      data: redactedData, // Store the redacted version
      is_redacted: true,
    });

    await insertAuditLog({
      action: "ANALYSIS_CREATED",
      details: `Analyzed ${req.files.length} file(s). Bank: ${data.bank || "Unknown"}. Period: ${data.period || "Unknown"}. Transactions: ${(data.transactions || []).length}.`,
      ip,
    });

    // Return FULL (unredacted) data to the current user session
    res.json({ id, ...data });
  } catch (error) {
    console.error("Analysis error:", error);
    await insertAuditLog({
      action: "ANALYSIS_FAILED",
      details: `Analysis failed: ${error.message}`,
      ip,
    });
    res.status(500).json({ error: error.message || "Failed to analyze statements" });
  }
});

// Get all analyses (Admin)
app.get("/api/analyses", requireAdmin, async (req, res) => {
  try {
    const analyses = await getAllAnalyses();
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get aggregate stats (Admin)
app.get("/api/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single analysis
app.get("/api/analyses/:id", async (req, res) => {
  const ip = getClientIp(req);
  try {
    const analysis = await getAnalysisById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    await insertAuditLog({
      action: "ANALYSIS_VIEWED",
      details: `Viewed analysis ${req.params.id} (Bank: ${analysis.bank || "Unknown"})`,
      ip,
    });
    res.json({ id: analysis.id, ...analysis.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update analysis (e.g., category edits)
app.put("/api/analyses/:id", async (req, res) => {
  const ip = getClientIp(req);
  try {
    const { id } = req.params;
    const data = req.body;
    await updateAnalysis(id, data);
    await insertAuditLog({
      action: "ANALYSIS_UPDATED",
      details: `Updated analysis ${id}`,
      ip,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check for Render
app.get("/", (req, res) => {
  res.send("Expense Manager API is running!");
});

// Delete analysis (Admin)
app.delete("/api/analyses/:id", requireAdmin, async (req, res) => {
  const ip = getClientIp(req);
  try {
    await deleteAnalysis(req.params.id);
    await insertAuditLog({
      action: "ANALYSIS_DELETED",
      details: `Deleted analysis ${req.params.id}`,
      ip,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: Audit Logs ---
app.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const data = await getAuditLogs(limit, offset);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: API Usage ---
app.get("/api/admin/api-usage", requireAdmin, async (req, res) => {
  try {
    const data = await getApiUsage();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: CSV Export Audit ---
app.post("/api/admin/log-export", requireAdmin, async (req, res) => {
  const ip = getClientIp(req);
  await insertAuditLog({ action: "CSV_EXPORTED", details: "Admin exported analyses as CSV", ip });
  res.json({ success: true });
});

initDb().then(() => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Backend server running on port ${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
