import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { analyzeStatementsServer } from "./geminiService.js";
import { initDb, insertAnalysis, getAllAnalyses, getAnalysisById, updateAnalysis, deleteAnalysis, getStats } from "./db.js";

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

// Middleware for simple admin auth
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// --- ROUTES ---

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_PASSWORD }); // In a real app, generate a JWT
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// Change admin password
app.post("/api/admin/change-password", requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
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
    res.json({ success: true, token: newPassword });
  } catch (err) {
    console.error("Failed to write to .env:", err);
    // Still return success since memory is updated, but warn
    res.json({ success: true, token: newPassword, warning: "Could not persist to .env file" });
  }
});

// Analyze new statements
app.post("/api/analyze", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const data = await analyzeStatementsServer(req.files);

    const id = uuidv4();
    const totalSpent = (data.transactions || [])
      .filter(t => t.cat !== "Self Transfer")
      .reduce((s, t) => s + t.amount, 0);

    await insertAnalysis({
      id,
      period: data.period,
      bank: data.bank,
      account_holder: data.account_holder,
      total_spent: totalSpent,
      transaction_count: (data.transactions || []).length,
      data,
    });

    res.json({ id, ...data });
  } catch (error) {
    console.error("Analysis error:", error);
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
  try {
    const analysis = await getAnalysisById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }
    res.json({ id: analysis.id, ...analysis.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update analysis (e.g., category edits)
app.put("/api/analyses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    await updateAnalysis(id, data);
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
  try {
    await deleteAnalysis(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDb().then(() => {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Backend server running on port ${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
