import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import * as mupdf from "mupdf";
import sharp from "sharp";
import { analyzeStatementsServer, PAGE_EXTRACTION_PROMPT, GLOBAL_INSIGHTS_PROMPT } from "./geminiService.js";
import { redactPII } from "./piiRedactor.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  initDb, insertAnalysis, getAllAnalyses, getAnalysisById,
  updateAnalysis, deleteAnalysis, getStats,
  insertAuditLog, getAuditLogs,
  getApiUsage,
  findAdmin, updateAdminAttempts, resetAdminAttempts, updateAdminPassword,
  getUserAnalyses, getUserStats
} from "./db.js";
import { getAccessibleAnalysis, updateAccessibleAnalysis, listAnalyses, listAuditLogs, analysisExportCursor } from './db.js';
import { requireAnalysisAccess } from './middleware/analysisAccess.js';
import { getJwtSecret } from './config.js';
import { normalizeExtractedTransactions, summarizeMoney, reconcileAnalysis, buildInsightInput } from './lib/analysisQuality.js';
import { serializeCsv } from './lib/csv.js';
import { helmetMiddleware, createCorsMiddleware, adminRateLimit, loginRateLimit } from "./middleware/security.js";
import { validate } from "./middleware/validate.js";
import { validateFileTypes } from "./middleware/fileTypeCheck.js";
import { loginSchema, changePasswordSchema, updateAnalysisSchema, analysisListSchema, auditListSchema } from "./schemas.js";
import { initSentry, sentryErrorHandler, captureException } from "./lib/sentry.js";
import { requireAdmin, requireUserAuth, optionalUserAuth } from "./middleware/auth.js";
import { filterTransactionsByPeriod } from "./lib/dateFilter.js";

dotenv.config();

const JWT_SECRET = getJwtSecret();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// --- Security middleware ---
app.use(helmetMiddleware);
app.use(createCorsMiddleware());
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

export async function convertPdfToImages(fileBuffer, password, onPageConverted = null) {
  let doc = null;
  try {
    const cleanPassword = (password || "").trim();
    console.log("Converting PDF to images with mupdf...");
    
    doc = mupdf.Document.openDocument(fileBuffer, "application/pdf");
    
    if (doc.needsPassword()) {
      if (!cleanPassword || !doc.authenticatePassword(cleanPassword)) {
        console.log("Incorrect password provided for PDF");
        return null; // Signal: wrong password
      }
    }
    
    const count = doc.countPages();
    const images = new Array(count);
    
    // Dynamically adjust scale and quality to stay under Vercel's 4.5MB payload limit
    let scale = 1.6;
    let quality = 80;
    
    if (count > 15) {
      scale = 1.0;
      quality = 65;
    } else if (count > 10) {
      scale = 1.2;
      quality = 70;
    } else if (count > 5) {
      scale = 1.4;
      quality = 75;
    }
    
    console.log(`Processing ${count} pages with scale ${scale}x and Grayscale JPEG quality ${quality} (concurrency limit: 4)`);
    
    let index = 0;
    async function worker() {
      while (index < count) {
        const i = index++;
        const page = doc.loadPage(i);
        const pixmap = page.toPixmap([scale, 0, 0, scale, 0, 0], mupdf.ColorSpace.DeviceRGB, false);
        const pngUint8 = pixmap.asPNG();
        pixmap.destroy();
        
        const jpegBuffer = await sharp(Buffer.from(pngUint8))
          .grayscale()
          .jpeg({ quality })
          .toBuffer();
        
        images[i] = jpegBuffer;
        if (onPageConverted) {
          try {
            onPageConverted(i + 1, count);
          } catch (e) {
            console.error("Progress callback failed:", e.message);
          }
        }
      }
    }
    
    // Concurrency limit of 4
    const workers = Array.from({ length: Math.min(4, count) }, () => worker());
    await Promise.all(workers);
    
    console.log(`Successfully converted PDF to ${images.length} images`);
    return images;
  } catch (err) {
    console.error("PDF Processing Error:", err.message);
    if (err.message?.includes("Incorrect password")) {
      return null;
    }
    throw err;
  } finally {
    if (doc && doc.destroy) doc.destroy();
  }
}

// --- Image Compression Helper ---
async function compressImage(fileBuffer) {
  try {
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    let pipeline = image.grayscale();

    // Resize if dimensions exceed 2000px to speed up Gemini processing and keep payload small
    const MAX_DIMENSION = 2000;
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      if (metadata.width > metadata.height) {
        pipeline = pipeline.resize({ width: MAX_DIMENSION, withoutEnlargement: true });
      } else {
        pipeline = pipeline.resize({ height: MAX_DIMENSION, withoutEnlargement: true });
      }
    }

    return await pipeline
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (err) {
    console.error("Image compression error:", err.message);
    return fileBuffer; // Fallback to original buffer
  }
}

// --- ROUTES ---

// Admin Login
app.post("/api/admin/login", loginRateLimit, validate(loginSchema), async (req, res) => {
  const password = req.body.password;
  const ip = getClientIp(req);
  
  try {
    const admin = await findAdmin();
    if (!admin) {
      return res.status(500).json({ error: "Admin account not initialized" });
    }

    // Check account-level lock
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      const remainingMin = Math.ceil((admin.lockUntil - new Date()) / (60 * 1000));
      return res.status(403).json({ error: `Account temporarily locked. Try again in ${remainingMin} minutes.` });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (isMatch) {
      await resetAdminAttempts();
      const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: "30m" });
      
      await insertAuditLog({ action: "ADMIN_LOGIN", details: "Admin logged in successfully", ip });
      res.json({ token });
    } else {
      const newAttempts = (admin.loginAttempts || 0) + 1;
      let lockUntil = null;
      let message = "Invalid password";
      
      if (newAttempts >= 10) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        message = "Account locked due to too many failed attempts. Try again in 15 minutes.";
      }
      
      await updateAdminAttempts(newAttempts, lockUntil);
      await insertAuditLog({ 
        action: "ADMIN_LOGIN_FAILED", 
        details: `Failed login attempt (attempts: ${newAttempts})`, 
        ip 
      });
      
      res.status(401).json({ error: message });
    }
  } catch (error) {
    console.error("Login route error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Change admin password
app.post("/api/admin/change-password", requireAdmin, validate(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ip = getClientIp(req);
  
  try {
    const admin = await findAdmin();
    if (!admin) {
      return res.status(500).json({ error: "Admin account not initialized" });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: "New password must be at least 12 characters" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await updateAdminPassword(newHash);
    await insertAuditLog({ action: "PASSWORD_CHANGED", details: "Admin password was changed", ip });

    // Generate new token
    const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: "30m" });
    res.json({ success: true, token });
  } catch (error) {
    console.error("Change password route error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze new statements
app.post("/api/analyze", optionalUserAuth, upload.array("files", 10), validateFileTypes, async (req, res) => {
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
        // Extract password from multiple possible sources (body, json map)
        const password = pdfPasswords[file.originalname] || pdfPasswords[`file_${i}`] || req.body[`password_${i}`] || "";
        
        // Convert PDF to images to guarantee Gemini compatibility and handle encryption
        const imageBuffers = await convertPdfToImages(file.buffer, password);
        
        if (imageBuffers === null) {
          const isRetry = !!password;
          return res.status(400).json({
            error: isRetry ? "PDF_PASSWORD_INCORRECT" : "PDF_PASSWORD_REQUIRED",
            message: isRetry 
              ? `Incorrect password for "${file.originalname}". Please try again.`
              : `The file "${file.originalname}" is password-protected. Please provide the password.`,
            fileName: file.originalname,
            fileIndex: i,
          });
        }

        // Send each page as a PNG to Gemini
        imageBuffers.forEach((buf, idx) => {
          processedFiles.push({
            originalname: `${file.originalname}_page_${idx + 1}.jpg`,
            mimetype: "image/jpeg",
            buffer: buf,
          });
        });
      } else {
        console.log(`Compressing uploaded image: ${file.originalname} (${Math.round(file.buffer.length / 1024)}KB)`);
        const compressedBuffer = await compressImage(file.buffer);
        console.log(`Compressed image from ${Math.round(file.buffer.length / 1024)}KB to ${Math.round(compressedBuffer.length / 1024)}KB`);
        processedFiles.push({
          originalname: file.originalname,
          mimetype: "image/jpeg",
          buffer: compressedBuffer,
        });
      }
    }

    const data = await analyzeStatementsServer(processedFiles);

    // Filter transactions to exclude illustrative pages/samples outside statement period
    if (data.transactions && data.period) {
      data.transactions = filterTransactionsByPeriod(data.transactions, data.period);
    }

    // Validate: if AI returned zero transactions, return an error instead of blank data
    if (!data.transactions || data.transactions.length === 0) {
      console.warn("[V1] Analysis returned 0 transactions — returning error to client");
      return res.status(422).json({ 
        error: "No transactions could be extracted from the uploaded statement. The image may be unclear, or the document may not contain readable transaction data. Please try uploading a clearer image." 
      });
    }

    const id = uuidv4();
    
    // Ensure total_reward_points is aggregated correctly from transaction reward points
    const computedTotalRewardPoints = (data.transactions || []).reduce((s, t) => s + (t.reward_points || 0), 0);
    data.total_reward_points = data.total_reward_points || computedTotalRewardPoints;

    const totalSpent = (data.transactions || [])
      .filter(t => t.cat !== "Self Transfer")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Redact PII before saving to database
    const redactedData = redactPII(data);

    if (req.user) await insertAnalysis({
      id,
      period: data.period,
      bank: data.bank,
      account_holder: data.account_holder || null, // Store original name for admin
      total_spent: totalSpent,
      transaction_count: (data.transactions || []).length,
      data: redactedData, // Store the redacted version
      is_redacted: true,
      owner_id: req.user ? req.user.id : null,
    });

    if (req.user) await insertAuditLog({
      action: "ANALYSIS_CREATED",
      details: `Analyzed ${req.files.length} file(s). Bank: ${data.bank || "Unknown"}. Period: ${data.period || "Unknown"}. Transactions: ${(data.transactions || []).length}.`,
      ip,
    });

    res.json({ ...redactedData, id: req.user ? id : null, session_only: !req.user });
  } catch (error) {
    console.error("Analysis error:", error);
    try {
      await insertAuditLog({
        action: "ANALYSIS_FAILED",
        details: `Analysis failed: ${error.message}`,
        ip,
      });
    } catch (logErr) {
      console.error("Failed to write audit log:", logErr.message);
    }
    res.status(500).json({ error: error.message || "Failed to analyze statements" });
  }
});

// Get all analyses (Admin)
app.get("/api/analyses", requireAdmin, async (req, res) => {
  try {
    const parsed = analysisListSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid filters', details: parsed.error.issues });
    const analyses = await listAnalyses(parsed.data);
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
app.get("/api/analyses/:id", requireAnalysisAccess, async (req, res) => {
  const ip = getClientIp(req);
  try {
    const analysis = await getAccessibleAnalysis(req.params.id, req.analysisAccess);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    await insertAuditLog({
      action: "ANALYSIS_VIEWED",
      details: `Viewed analysis ${req.params.id} (Bank: ${analysis.bank || "Unknown"})`,
      ip,
    });
    res.json({ id: analysis.id, ...analysis.data, account_holder: analysis.account_holder || analysis.data?.account_holder || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update analysis (e.g., category edits)
app.put("/api/analyses/:id", requireAnalysisAccess, validate(updateAnalysisSchema), async (req, res) => {
  const ip = getClientIp(req);
  try {
    const { id } = req.params;
    const updated = await updateAccessibleAnalysis(id, req.body.edits, req.analysisAccess);
    if (!updated) return res.status(404).json({ error: 'Analysis not found' });
    await insertAuditLog({
      action: "ANALYSIS_UPDATED",
      details: `Updated analysis ${id}`,
      ip,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to update analysis' });
  }
});

// Get health status (Cron / Keep-alive)
const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy and running",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
};

app.get("/health", getHealthStatus);
app.get("/api/health", getHealthStatus);


// Stream analysis progress via Server-Sent Events (SSE)
app.post("/api/v2/analyze", optionalUserAuth, upload.array("files", 10), validateFileTypes, async (req, res) => {
  const ip = getClientIp(req);
  
  // Configure response headers for Server-Sent Events
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });

  const sendSSE = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (!req.files || req.files.length === 0) {
      sendSSE("error", { message: "No files uploaded" });
      return res.end();
    }

    let pdfPasswords = {};
    try {
      if (req.body.pdfPasswords) {
        pdfPasswords = JSON.parse(req.body.pdfPasswords);
      }
    } catch (e) {}

    const imageFiles = [];
    
    // 1. PDF to image conversion
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      if (file.mimetype === "application/pdf") {
        const password = pdfPasswords[file.originalname] || pdfPasswords[`file_${i}`] || req.body[`password_${i}`] || "";
        
        const pages = await convertPdfToImages(file.buffer, password, (pageNum, totalPages) => {
          sendSSE("page_converted", { file: file.originalname, page: pageNum, total: totalPages });
        });

        if (pages === null) {
          const isRetry = !!password;
          sendSSE("error", { 
            code: isRetry ? "PDF_PASSWORD_INCORRECT" : "PDF_PASSWORD_REQUIRED", 
            message: isRetry 
              ? `Incorrect password for "${file.originalname}". Please try again.`
              : `The file "${file.originalname}" is password-protected. Please provide the password.`,
            fileName: file.originalname,
            fileIndex: i
          });
          return res.end();
        }

        pages.forEach((buf, pageIdx) => {
          imageFiles.push({
            buffer: buf,
            mimetype: "image/jpeg",
            originalname: `${file.originalname}_page_${pageIdx + 1}.jpg`
          });
        });
      } else {
        imageFiles.push(file);
      }
    }

    const totalImages = imageFiles.length;
    let allTransactions = [];
    let bankName = null;
    let statementType = null;
    let period = null;
    let accountHolder = null;
    let openingBalance = null;
    let closingBalance = null;
    let totalCredits = null;
    let totalRewardPoints = null;
    const extractionWarnings = [];
    if (req.files.length > 1) extractionWarnings.push('Multiple files combined: reconciliation is unavailable; review individual statements and periods.');

    // 2. Page-by-page transaction extraction
    for (let i = 0; i < totalImages; i++) {
      const imgFile = imageFiles[i];
      
      // We run extractTransactions using analyzeStatementsServer with PAGE_EXTRACTION_PROMPT
      const pageResult = await analyzeStatementsServer([imgFile], PAGE_EXTRACTION_PROMPT);
      
      const normalized = normalizeExtractedTransactions(pageResult.transactions, { page: i + 1 });
      extractionWarnings.push(...normalized.warnings);
      // Only deduplicate explicit reference-matched rows at adjacent page boundaries.
      const previous = allTransactions.at(-1);
      const first = normalized.transactions[0];
      if (req.files.length === 1 && previous && first && previous.reference && first.reference === previous.reference && first.date === previous.date && first.amount === previous.amount && first.desc === previous.desc) normalized.transactions.shift();
      allTransactions.push(...normalized.transactions);
      if (pageResult.bank && !bankName) bankName = pageResult.bank;
      if (pageResult.statement_type === 'bank_account' || pageResult.statement_type === 'credit_card') {
        if (statementType && statementType !== pageResult.statement_type) extractionWarnings.push('Mixed statement types: reconciliation requires review');
        statementType = statementType === 'credit_card' ? statementType : pageResult.statement_type;
      }
      if (pageResult.period && !period) period = pageResult.period;
      if (pageResult.account_holder && !accountHolder) accountHolder = pageResult.account_holder;
      
      if (pageResult.opening_balance !== undefined && pageResult.opening_balance !== null && openingBalance === null) {
        openingBalance = pageResult.opening_balance;
      }
      if (pageResult.closing_balance !== undefined && pageResult.closing_balance !== null) {
        closingBalance = pageResult.closing_balance;
      }
      if (typeof pageResult.total_credits === 'number' && Number.isFinite(pageResult.total_credits)) {
        totalCredits = totalCredits == null ? pageResult.total_credits : Math.max(totalCredits, pageResult.total_credits);
      }
      if (pageResult.reward_total_scope === 'statement' && typeof pageResult.total_reward_points === 'number' && Number.isFinite(pageResult.total_reward_points)) {
        totalRewardPoints = pageResult.total_reward_points;
      }

      sendSSE("page_extracted", { index: i + 1, total: totalImages, transactionsCount: pageResult.transactions?.length || 0 });
    }

    // Filter transactions to exclude illustrative pages/samples outside statement period
    if (allTransactions.length > 0 && period && req.files.length === 1) {
      allTransactions = filterTransactionsByPeriod(allTransactions, period);
    }

    // Validate: if zero transactions were extracted across all pages, send error
    if (allTransactions.length === 0) {
      console.warn("[V2] Analysis returned 0 transactions across all pages — sending error to client");
      sendSSE("error", { 
        message: "No transactions could be extracted from the uploaded statement. The image may be unclear, or the document may not contain readable transaction data. Please try uploading a clearer image." 
      });
      return res.end();
    }

    sendSSE("finalizing", { message: "Running PII redaction and generating global insights..." });

    // Ensure total_reward_points is aggregated correctly from transaction reward points
    const rewardRows = allTransactions.filter(t => typeof t.reward_points === 'number' && Number.isFinite(t.reward_points));
    const finalRewardPoints = rewardRows.length ? rewardRows.reduce((sum, t) => sum + t.reward_points, 0) : totalRewardPoints;

    // 3. PII Redaction
    const combinedData = {
      statement_type: req.files.length === 1 ? statementType : null,
      bank: bankName,
      period: period,
      account_holder: accountHolder,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_credits: totalCredits,
      total_reward_points: finalRewardPoints,
      transactions: allTransactions,
      insights: []
    };

    const redactedData = redactPII(combinedData);
    redactedData.quality = { warnings: extractionWarnings, reconciliation: reconcileAnalysis(combinedData) };

    // 4. Generate global insights from JSON
    const insightsPrompt = GLOBAL_INSIGHTS_PROMPT + '\nInput summaries use integer paise and cover every transaction.\n' + JSON.stringify(buildInsightInput(redactedData.transactions));
    try {
      const insightsResult = await analyzeStatementsServer([], insightsPrompt);
      redactedData.insights = insightsResult.insights || [];
    } catch {
      redactedData.insights = [];
      redactedData.quality.warnings.push('Insights are unavailable. Extracted transactions are still available.');
    }

    // 5. Store in database
    const id = uuidv4();
    const totalSpent = summarizeMoney(redactedData.transactions).netSpend / 100;

    if (req.user) await insertAnalysis({
      id,
      period: redactedData.period,
      bank: redactedData.bank,
      account_holder: accountHolder || null,
      total_spent: totalSpent,
      transaction_count: (redactedData.transactions || []).length,
      data: redactedData,
      is_redacted: true,
      owner_id: req.user ? req.user.id : null,
    });

    if (req.user) await insertAuditLog({
      action: "ANALYSIS_CREATED",
      details: `Analyzed ${req.files.length} file(s). Bank: ${bankName || "Unknown"}. Period: ${period || "Unknown"}. Transactions: ${allTransactions.length}.`,
      ip,
    });

    sendSSE("done", { ...redactedData, id: req.user ? id : null, session_only: !req.user });
    res.end();
  } catch (error) {
    console.error("v2 analysis error:", error);
    sendSSE("error", { message: error.message || "Failed to analyze statements" });
    res.end();
  }
});

// Get logged-in user's analyses
app.get("/api/v2/me/analyses", requireUserAuth, async (req, res) => {
  try {
    const analyses = await getUserAnalyses(req.user.id);
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logged-in user's stats
app.get("/api/v2/me/stats", requireUserAuth, async (req, res) => {
  try {
    const stats = await getUserStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete logged-in user's own analysis
app.delete("/api/v2/me/analyses/:id", requireUserAuth, async (req, res) => {
  try {
    const result = await deleteAnalysis(req.params.id, req.user.id);
    if (!result.deletedCount) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Health check for Render
app.get("/", (req, res) => {
  res.send("Expense Manager API is running!");
});

app.get("/api/ping", (req, res) => {
  res.json({ status: "ok" });
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
app.get("/api/admin/audit-logs", adminRateLimit, requireAdmin, async (req, res) => {
  try {
    const parsed = auditListSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid filters' });
    const data = await listAuditLogs(parsed.data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: API Usage ---
app.get("/api/admin/api-usage", adminRateLimit, requireAdmin, async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const data = await getApiUsage();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: CSV Export Audit ---
app.post("/api/admin/log-export", adminRateLimit, requireAdmin, async (req, res) => {
  const ip = getClientIp(req);
  await insertAuditLog({ action: "CSV_EXPORTED", details: "Admin exported analyses as CSV", ip });
  res.json({ success: true });
});

app.get('/api/admin/export', adminRateLimit, requireAdmin, async (req, res) => {
  const parsed = analysisListSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid filters' });
  const cursor = analysisExportCursor(parsed.data);
  let count = 0;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="spend-analyses.csv"');
  res.setHeader('Cache-Control', 'no-store');
  const write = chunk => new Promise((resolve, reject) => {
    if (res.destroyed) return reject(new Error('Download disconnected'));
    if (res.write(chunk)) return resolve();
    const finish = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Download disconnected')); };
    const cleanup = () => { res.off('drain', finish); res.off('close', fail); res.off('error', fail); };
    res.once('drain', finish); res.once('close', fail); res.once('error', fail);
  });
  try {
    await write('\uFEFF' + serializeCsv(['ID', 'Created', 'Period', 'Bank', 'Account Holder', 'Transactions', 'Net Spend'], []) + '\r\n');
    for await (const row of cursor) {
      await write(serializeCsv([], [[row.id, row.created_at?.toISOString(), row.period, row.bank, row.account_holder, row.transaction_count, row.total_spent]]).replace(/^\r\n/, '') + '\r\n');
      count++;
    }
    await insertAuditLog({ action: 'CSV_EXPORTED', details: `Exported ${count} matching analyses`, ip: getClientIp(req) });
    res.end();
  } catch { res.destroy(); }
  finally { await cursor.close(); }
});

// --- Sentry error handler (must be after routes) ---
app.use(sentryErrorHandler());

export { app };
if (process.env.NODE_ENV !== 'test') initDb().then(async () => {
  await initSentry(app);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Backend server running on port ${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
