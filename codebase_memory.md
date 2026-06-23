# Codebase Memory — Spend Analysis

This file serves as a comprehensive developer reference and memory bank for the **Spend Analysis** application. It describes the project’s purpose, technical stack, file architecture, core logic flows, and project status.

---

## 🧠 Project Overview

**Spend Analysis** is a full-stack, AI-powered personal finance utility that processes bank statements (images or password-protected PDFs), extracts debit transaction data using Google Gemini's vision APIs, and displays an interactive spend dashboard in real-time. 

### Core Value Props
1. **Zero Data Entry**: Vision OCR + structured extraction via Gemini API.
2. **Privacy-First**: Sensitive PII is redacted at the API layer before database persistence.
3. **Credit Card Rewards Tracking**: Extracts and visualizes credit card reward points, category reward rates, and point-earning history.
4. **Admin Audit Trail**: Admin portal tracks usage, API statistics, latency, and all data access operations.

---

## 🏗️ Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Vite + React 19)                  │
│                                                             │
│  ┌────────────────┐    ┌─────────────────┐   ┌───────────┐  │
│  │  UploadScreen  │ ── │ ExpenseManager  │ ─ │  Admin/   │  │
│  │ (PDF Password) │    │ (Charts/Tables) │   │ Dashboard │  │
│  └────────────────┘    └─────────────────┘   └───────────┘  │
│           │                     │                  │        │
└───────────┼─────────────────────┼──────────────────┼────────┘
            │                     │ (Update Category)│ (Fetch Audit Logs)
            ▼ (Multipart Upload)  ▼ (PUT request)    ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Express 5 + Node)                  │
│                                                             │
│  ┌────────────────┐    ┌─────────────────┐   ┌───────────┐  │
│  │ MuPDF / Sharp  │ ── │  PII Redactor   │ ─ │  Gemini   │  │
│  │ (PDF → Image)  │    │  (PII Scrubbing)│   │  Service  │  │
│  └────────────────┘    └─────────────────┘   └───────────┘  │
│                                 │                  │        │
│                                 ▼                  │        │
│                       ┌───────────────────┐        │        │
│                       │   MongoDB Atlas   │        │        │
│                       │ (Analyses/Audit)  │ ◄──────┘        │
└───────────────────────┴───────────────────┴─────────────────┘
```

---

## 🛠️ Technical Stack

| Layer | Technologies | Key Role |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8 | Single Page Application, Hash Routing (`#/`, `#/dashboard`, `#/admin/login`, `#/admin/dashboard`) |
| **Styling** | Vanilla CSS, CSS Variables | Global themes (Dark/Light mode support) |
| **Visualization** | Recharts | Pie/donut charts, bar charts, custom interactive legends |
| **Icons** | Lucide React | Clean, scalable SVG icons |
| **Backend** | Express 5, Node.js | REST APIs, multipart file ingestion, admin controller |
| **AI Ingestion** | Google Gemini (3.5-flash / 2.5-flash) | Structured JSON OCR, transaction classification, natural language insights |
| **Fallback AI** | OpenAI API client (optional) | Frontend fallback client using `gpt-4o-mini` |
| **PDF Processing**| MuPDF WASM (`mupdf`) | PDF decryption + page-to-image conversion |
| **Image Handler** | Sharp (`sharp`) | Image resizing, auto-grayscale, and JPEG compression for payload budget reduction |
| **Database** | MongoDB Atlas, Mongoose 9 | Persistent analysis records, security audit logs, and API usage stats |

---

## 📁 Repository Directory Structure

```
spend-analysis/
├── PROJECT_RULES.md            # Canonical rules and GSD protocols
├── GSD-STYLE.md                # Style guidelines & UI/UX conventions
├── codebase_memory.md          # ← This developer reference document
├── .gsd/                       # Project methodology state tracking
│   ├── SPEC.md                 # Product specifications (FINALIZED)
│   ├── ROADMAP.md              # Milestones & Phase breakdown
│   ├── STATE.md                # Session memory & completed history
│   └── SESSION_MEMORY.md       # Live developer context tracker
├── docs/                       # Operational guides
│   ├── runbook.md              # Command logs, verification checklists, and recovery steps
│   ├── model-selection-playbook.md
│   └── token-optimization-guide.md
├── frontend/                   # React Client Application
│   ├── src/
│   │   ├── main.jsx            # React mount script
│   │   ├── App.jsx             # Hash router & global state orchestrator
│   │   ├── App.css / index.css # Application style system (dark mode first)
│   │   ├── components/         # Core React components
│   │   │   ├── UploadScreen.jsx      # File upload, drag-and-drop, PDF passwords
│   │   │   ├── ExpenseManager.jsx    # Dashboard, charts, search, category reclassification
│   │   │   ├── RewardsPanel.jsx      # Credit card reward points panel & graphs
│   │   │   ├── Toast.jsx             # Custom notification banners
│   │   │   └── admin/                # Admin Panel Components
│   │   │       ├── AdminLogin.jsx
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminSettingsModal.jsx
│   │   │       ├── ApiUsageTab.jsx   # Gemini API quotas & latency graphs
│   │   │       └── AuditLogTab.jsx   # Detailed system event log table
│   │   ├── services/
│   │   │   ├── apiService.js         # REST interface wrappers for Express
│   │   │   ├── cacheService.js       # Browser localStorage caching
│   │   │   ├── geminiService.js      # Client-side API dispatch
│   │   │   └── openaiService.js      # Optional frontend OpenAI backup
│   │   └── data/
│   │       └── sampleData.js         # Dummy dashboard data for demo mode
│   └── package.json
└── backend/                    # Node.js Server Application
    ├── server.js               # Entry point, Express routes, PDF/Image pre-processing
    ├── geminiService.js        # Server-side Gemini API dispatch, fallbacks, prompts
    ├── piiRedactor.js          # Regex PII scrubber (UPI, Account numbers, emails)
    ├── db.js                   # Mongoose setup, schemas (Analysis, AuditLog, ApiUsage)
    ├── data/                   # Server database artifacts
    │   ├── expense.db          # Embedded DB storage
    │   └── expense.json        # Seed files
    └── package.json
```

---

## ⚙️ Core Implementation Details

### 1. WASM-based PDF Decryption & Grayscale Ingestion
Located in `backend/server.js:convertPdfToImages`:
* Receives file buffers and candidate passwords.
* Uses **MuPDF WASM** to load the PDF. If password-protected, tests the password inside a secure container.
* Automatically rasterizes PDF pages into PNGs.
* Runs **Sharp** over the resulting images to convert them to **Grayscale JPEGs** with custom compression rates (based on page count) to reduce payload sizes, preventing Vercel's 4.5MB request timeout while maintaining high resolution for OCR.

### 2. Regex-Based PII Redaction
Located in `backend/piiRedactor.js`:
Before the extracted data is written to MongoDB Atlas, the backend cleans the object:
* Account holder name is replaced with `"REDACTED"`.
* Exact balances (`opening_balance`, `closing_balance`, `total_credits`) are removed from persistent logs.
* Custom regular expressions strip:
  * **UPI IDs**: `[a-zA-Z0-9.\-_]+@[a-zA-Z]+` → `***@upi`
  * **Numeric IDs (10+ digits)**: Phone numbers, bank accounts, Aadhaar → `**********`
  * **Email Addresses**: `***@***.***`
* Original unredacted data is still returned to the active frontend upload session.

### 3. Server-side Gemini Model Chain & Fallbacks
Located in `backend/geminiService.js`:
If a model rate-limits, location-blocks, or fails to parse, it steps down a structured chain:
1. `gemini-3.5-flash` (Primary)
2. `gemini-2.5-flash`
3. `gemini-2.5-flash-lite`
4. `gemini-3.1-flash-lite`
5. `gemini-2.0-flash`
6. `gemini-2.0-flash-lite`

It also toggles Google API versions (`v1beta` and `v1`) and supports routing via an optional proxy (`GEMINI_PROXY_URL`) to bypass geographical restriction issues.

### 4. Classification Quality Auto-Fixes
Located in `backend/geminiService.js:fixMisclassifiedCategories`:
* **Zero Transaction Validation**: Attempts up to 2 retries with increasing temperature if 0 transactions are found.
* **Dominant Category Detection**: If $\ge 5$ transactions are extracted and $100\%$ share the same category (unless labeled `"Other"`), a custom `RETRY_PROMPT` is triggered to force re-analysis.
* **Fallback Corrections**: Applies string keyword matches (e.g., `"swiggy"`, `"zomato"` $\to$ `"Food & Dining"`; `"uber"`, `"ola"` $\to$ `"Transport"`) to clean misclassifications. UPI transfers defaulting to self-transfers are auto-corrected to `"Personal Transfer"`.

---

## 🔒 Security & Admin Auditing

The application features a secure audit logging layer defined in `backend/db.js` using `auditLogSchema`:
* **Logged Actions**: `ADMIN_LOGIN`, `ADMIN_LOGIN_FAILED`, `PASSWORD_CHANGED`, `ANALYSIS_CREATED`, `ANALYSIS_FAILED`, `ANALYSIS_VIEWED`, `ANALYSIS_UPDATED`, `ANALYSIS_DELETED`, `CSV_EXPORTED`.
* Tracks timestamps, action names, descriptions, and hashed/scrubbed IP origins.
* API latency, success metrics, and token consumption are tracked inside the `ApiUsage` collection, helping to monitor Gemini costs and performance issues.

---

## 📈 Project Status

According to `.gsd/STATE.md`:
* **Phase 1 (Foundation & Dashboard)**: ✅ Complete
* **Phase 2 (AI Upload Flow & Gemini Integration)**: ✅ Complete
* **Operational Stability**:
  * Resolved Gemini API 504 gateway timeout bugs during image uploads.
  * Stabilized GET caching issues on admin portals and resolved refresh feedback UI bugs.
  * Verified credit card reward points extraction logic works, and displays in the **RewardsPanel** component when points data is parsed.

---

*This file should be kept updated whenever key architecture decisions, new service routes, or schema changes are introduced.*
