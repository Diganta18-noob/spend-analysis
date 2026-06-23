# Codebase Memory — Spend Analysis

This file serves as the permanent intelligence hub and operational brain of the **Spend Analysis** project. It is designed to get a new engineer up to speed on the project's business purpose, architectural design, routing, data flows, API inventory, database schema, dependencies, and deployment.

---

## 1. Project Overview & Business Purpose

### What It Does
**Spend Analysis** is an AI-powered financial statements analyzer. Users upload pictures, screenshots, or PDF files of their bank or credit card statements. The application extracts the debit transactions, categorizes them automatically, generates data-driven insights, and provides an interactive dashboard representing their financial health.

### Why It Exists (Business Problem)
Personal financial planning is often tedious. Manual entry of transactions is time-consuming, and parsing varying PDF/CSV formats from different banks is highly complex. Spend Analysis automates this:
- **Zero manual input**: Extract financial details from visual bank statement files.
- **Privacy Assurance**: Redacts Personally Identifiable Information (PII) before storage so users don't have to worry about data leaks.
- **Credit Card Points Tracking**: Tracks credit card reward points to help users optimize credit card reward payouts.
- **Admin Supervision**: Tracks API costs, system audit trails, and server resource metrics.

### Key Users
- Individuals wanting to analyze their personal spending habits without downloading CSVs or inputting data manually.
- Credit card users looking to audit their rewards points and category reward rates.
- Site administrators overseeing API quotas, system safety logs, and application performance.

---

## 2. Technology Stack

### Frontend Client
* **Framework**: React 19 + Vite 8
* **Styling**: Vanilla CSS with CSS Variables for Dark/Light theme switching
* **Charts**: Recharts (Pie/Donut charts, vertical/horizontal bar charts, interactive custom legends)
* **Icons**: Lucide React
* **Router**: Custom Hash Router (`window.location.hash` based routing: `#`, `#dashboard`, `#admin/login`, `#admin/dashboard`)
* **State**: React hooks (`useState`, `useCallback`, `useEffect`) and browser `localStorage` caching

### Backend Server
* **Framework**: Express 5 (using native modern JS Modules)
* **File Processing**: Multer (in-memory buffer storage)
* **PDF Engine**: MuPDF WASM (`mupdf` library) for password-protected PDF decryption and rasterization
* **Image Compression**: Sharp (`sharp` library) for resizing, grayscaling, and JPEG compressing uploaded images
* **AI Ingestion**: Google Gemini API via Node fetch (utilizes `MODEL_CHAIN` fallbacks and dynamic retry handlers)
* **External Client Fallback**: OpenAI API `gpt-4o-mini` client built directly into the frontend code

### Database & Security
* **Database**: MongoDB Atlas via Mongoose 9
* **PII Redactor**: Custom regex-based PII scrubbing middleware
* **Authentication**: Token-based simple admin credentials stored in memory and persisted inside server-side `.env` files

---

## 3. Repository Structure

```
spend-analysis/
├── PROJECT_RULES.md            # Canonical rules and GSD protocols
├── GSD-STYLE.md                # Style guidelines & UI/UX conventions
├── codebase_memory.md          # Brief codebase developer guide
├── memory.md                   # ← This file (Master System Memory)
├── .gsd/                       # Project methodology state tracking
│   ├── SPEC.md                 # Product specifications (FINALIZED)
│   ├── ROADMAP.md              # Milestones & Phase breakdown
│   ├── STATE.md                # Session memory & completed history
│   └── SESSION_MEMORY.md       # Live developer context tracker
├── docs/                       # Operational guides
│   ├── runbook.md              # Command logs, verification checklists, and recovery steps
│   ├── model-selection-playbook.md
│   └── token-optimization-guide.md
├── frontend/                   # Frontend SPA client
│   ├── src/
│   │   ├── main.jsx            # React entry mount point
│   │   ├── App.jsx             # Router and Global orchestrator
│   │   ├── App.css / index.css # Application style files
│   │   ├── components/         # Frontend React Components
│   │   │   ├── UploadScreen.jsx      # Upload panel, passwords, dropzone
│   │   │   ├── ExpenseManager.jsx    # Dashboard, filters, tables, category updating
│   │   │   ├── RewardsPanel.jsx      # Credit card reward points rendering
│   │   │   ├── Toast.jsx             # System notifications
│   │   │   └── admin/                # Admin Panel Components
│   │   │       ├── AdminLogin.jsx
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminSettingsModal.jsx
│   │   │       ├── ApiUsageTab.jsx   # API metrics and latency charts
│   │   │       └── AuditLogTab.jsx   # Detailed system event log table
│   │   ├── services/
│   │   │   ├── apiService.js         # REST interface wrappers for Express
│   │   │   ├── cacheService.js       # LocalStorage cache wrapper
│   │   │   ├── geminiService.js      # Dispatcher to backend `/api/analyze`
│   │   │   └── openaiService.js      # Client-side OpenAI client
│   │   └── data/
│   │       └── sampleData.js         # Static demo analysis data
│   └── package.json
└── backend/                    # Backend API server
    ├── server.js               # Entry point, Express routing, file decrypter
    ├── geminiService.js        # AI prompt logic, fallback loops, keyword fixes
    ├── piiRedactor.js          # Regex scrubbers for PII redact
    ├── db.js                   # Mongoose collection schemas and CRUD wrappers
    ├── data/                   # JSON seed and DB file storage
    │   ├── expense.db
    │   └── expense.json
    └── package.json
```

---

## 4. System Architecture

### High-Level Architecture Diagram
```
[ User Uploads PDF / Images ]
             │
             ▼
┌───────────────────────────┐
│     Vite + React App      │ <== [ cacheService ] Caches analysis locally in browser
└───────────────────────────┘
             │
             ▼ POST /api/analyze (Multipart FormData)
┌───────────────────────────┐
│      Express Backend      │
└───────────────────────────┘
   │         │            │
   │ (WASM)  │ (Compress) │ (Redact)
   ▼         ▼            ▼
[MuPDF]  [Sharp]   [piiRedactor] ──► [MongoDB Atlas] (Stores Redacted Data)
   │         │
   └────┬────┘
        │ ( Grayscale JPEGs )
        ▼
┌───────────────────────────┐
│    Gemini Vision APIs     │ <== [ geminiService ] Loops through model/API fallbacks
└───────────────────────────┘
        │
        ▼ ( Structured JSON )
┌───────────────────────────┐
│      Express Backend      │
└───────────────────────────┘
             │
             ▼ ( Returns raw parsed JSON back to User )
┌───────────────────────────┐
│     Vite + React App      │
└───────────────────────────┘
             │
             ▼ Renders
[ ExpenseManager / RewardsPanel ]
```

---

## 5. Routing Map

The application utilizes simple, lightweight routing layers on both the client (hash-based routing) and server (Express router).

### Client Hash Routes
Managed inside [App.jsx](file:///c:/Antigravity/expense/manager/frontend/src/App.jsx):

| Hash Route | Rendered Component | Auth Required | Purpose |
| :--- | :--- | :--- | :--- |
| `#/` | [UploadScreen.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/UploadScreen.jsx) | No | File upload, password input, and demo launcher |
| `#/dashboard` | [ExpenseManager.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/ExpenseManager.jsx) | No (Uses Session Data) | Spending analytics, tables, insights, and rewards |
| `#/admin/login` | [AdminLogin.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/admin/AdminLogin.jsx) | No | Access gate to admin resources |
| `#/admin/dashboard`| [AdminDashboard.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/admin/AdminDashboard.jsx) | Yes (`admin_token`) | Admin audits, API monitoring, and management |

### Server API Endpoints
Defined inside [server.js](file:///c:/Antigravity/expense/manager/backend/server.js):

* `/api/ping` - Health Check (`GET`)
* `/api/analyze` - Parse uploaded files (`POST`)
* `/api/analyses/:id` - Fetch single analysis (`GET` / `PUT`)
* `/api/analyses` - Get all analyses list (`GET` - Admin Auth)
* `/api/stats` - Get aggregate system metrics (`GET` - Admin Auth)
* `/api/analyses/:id` - Delete analysis (`DELETE` - Admin Auth)
* `/api/admin/login` - Admin login authentication (`POST`)
* `/api/admin/change-password` - Update admin credentials (`POST` - Admin Auth)
* `/api/admin/audit-logs` - Get audit event logs (`GET` - Admin Auth)
* `/api/admin/api-usage` - Get API logs and metrics (`GET` - Admin Auth)
* `/api/admin/log-export` - Log CSV exports (`POST` - Admin Auth)

---

## 6. Frontend Architecture

### Component Hierarchy
```
App.jsx (State, hash router, local cache manager)
 ├── UploadScreen.jsx (File dropzone, password prompts for PDF, loading UI)
 ├── ExpenseManager.jsx (Dashboard container, search box, category editing)
 │    ├── RewardsPanel.jsx (Reward points breakdown, rates, point-earning graphs)
 │    └── Toast.jsx (Category update confirm/undo banners)
 └── admin/
      ├── AdminLogin.jsx (Admin credentials checker)
      └── AdminDashboard.jsx (Admin layout, navigation tab selector)
           ├── AdminSettingsModal.jsx (Password change modal)
           ├── ApiUsageTab.jsx (Latency line-chart and calls count)
           ├── AuditLogTab.jsx (Table showing system activity)
           └── ConfirmToast.jsx (Status messages)
```

### Global State & Caching
State is centralized inside `App.jsx` and passed down to child components as props.
* `data`: Contains the parsed financial analysis object (UUID, period, bank, transactions list, insights, rewards).
* Caching: Whenever `data` updates, `App.jsx` writes it to browser LocalStorage using `saveAnalysis` from `cacheService.js`. If the user returns, the application automatically loads the cached data and routes to `#/dashboard` without needing a re-upload.

---

## 7. Backend Architecture

The Express backend handles PDF/image decryption/processing, orchestrates Gemini queries, redacts sensitive info, and interacts with MongoDB.

### Core Modules
* **[server.js](file:///c:/Antigravity/expense/manager/backend/server.js)**: Configures Multer storage, handles route endpoints, and implements WASM PDF-to-Image rasterization and Sharp image grayscaling/compression.
* **[geminiService.js](file:///c:/Antigravity/expense/manager/backend/geminiService.js)**: Generates Gemini calls. Houses `AI_PROMPT`, the fallback chain (`MODEL_CHAIN`), and the post-processing classification rules (`fixMisclassifiedCategories`).
* **[piiRedactor.js](file:///c:/Antigravity/expense/manager/backend/piiRedactor.js)**: Redaction library cleaning UPI IDs, account holder names, exact balances, and account numbers prior to MongoDB insertions.
* **[db.js](file:///c:/Antigravity/expense/manager/backend/db.js)**: Connects to MongoDB Atlas using Mongoose and defines schemas for persisted data.

---

## 8. Database Architecture

Mongoose schemas are defined inside `backend/db.js`.

### DATABASE MAP

#### `Analysis` Collection
Stores metadata and redacted transaction payloads.

* **Fields**:
  * `id` (`String`, required, unique): UUID reference
  * `period` (`String`): Dates statement spans (e.g. `"01 Apr – 25 Apr 2026"`)
  * `bank` (`String`): Name of bank parsed
  * `account_holder` (`String`): Masked/redacted account holder name
  * `total_spent` (`Number`): Sum of all debit transactions (except Self Transfers)
  * `transaction_count` (`Number`): Number of transactions in analysis
  * `is_redacted` (`Boolean`): Set to `true` (PII redacted)
  * `data` (`Mixed`): Full redacted transaction list and insights payload
  * `created_at` (`Date`, default: `Now`): Ingestion timestamp

#### `AuditLog` Collection
Persists all operational actions for administrative auditing.

* **Fields**:
  * `id` (`String`, required): Unique ID (Epoch timestamp + random index)
  * `timestamp` (`Date`, default: `Now`): Execution timestamp
  * `action` (`String`): Type of action (`ANALYSIS_CREATED`, `ADMIN_LOGIN`, etc.)
  * `details` (`String`): Textual logs describing the event
  * `ip` (`String`): Client IP address (origins masked)

#### `ApiUsage` Collection
Maintains performance metrics of Gemini calls grouped daily.

* **Fields**:
  * `date` (`String`, required, unique): Calendar date (`YYYY-MM-DD`)
  * `provider` (`String`, default: `"gemini"`): AI Engine provider name
  * `total_calls` (`Number`): Total requests sent
  * `successful_calls` (`Number`): Success count
  * `failed_calls` (`Number`): Error count
  * `total_tokens_estimated` (`Number`): Accumulation of tokens used
  * `latencies` (`[Number]`): Array of the last 100 API request latencies (ms)
  * `errors` (`[Mixed]`): Array of error logs (capped at 50)

---

## 9. Authentication Flow

The application implements a lightweight token-based administrative authorization workflow.

```
[ Admin inputs Password in AdminLogin ]
                 │
                 ▼ POST /api/admin/login
┌──────────────────────────────────────────────┐
│               Backend Server                 │
└──────────────────────────────────────────────┘
                 │ Check against ADMIN_PASSWORD env var
         ┌───────┴───────┐
         ▼ Correct       ▼ Incorrect
┌───────────────────┐  ┌──────────────────┐
│ Return Auth Token │  │ Return 401 Error │
│ (Admin Password)  │  └──────────────────┘
└───────────────────┘
         │
         ▼ Client stores token in sessionStorage ("admin_token")
[ Client requests API Endpoint with Header: "Authorization: Bearer <admin_token>" ]
                 │
                 ▼
┌──────────────────────────────────────────────┐
│          Backend requireAdmin MW             │
└──────────────────────────────────────────────┘
                 │ Compare Header with current ADMIN_PASSWORD
         ┌───────┴───────┐
         ▼ Match         ▼ No Match
┌───────────────────┐  ┌──────────────────┐
│  Execute Handler  │  │ Return 401 Error │
└───────────────────┘  └──────────────────┘
```

---

## 10. Data Ingestion & Flow Diagrams

### Bank Statement Upload and Processing Flow
1. **User Action**: User drops statement images or PDFs into [UploadScreen.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/UploadScreen.jsx).
2. **Password Decryption**: If a PDF is protected, the UI prompts for the password, which is appended to the request.
3. **Multipart Request**: Files are transmitted via `multipart/form-data` to backend `POST /api/analyze`.
4. **Rasterization (PDFs)**: Backend `convertPdfToImages` uses MuPDF WASM to open the PDF with the provided password and convert pages into image buffers.
5. **Optimization (Images)**: Sharp converts images to grayscale and compresses them to fit in payload budgets.
6. **Gemini Extraction**: Grayscale image buffers are sent to the Gemini API (`geminiService.js`). It extracts transactions, period, bank, insights, and reward points, returning structured JSON.
7. **Quality Check**: Backend checks if the transactions list is empty or miscategorized. If yes, it retries with the `RETRY_PROMPT` up to 2 times. If categories are still misclassified, the `fixMisclassifiedCategories` keyword logic fixes them.
8. **PII Redaction**: Backend `piiRedactor.js` masks account holder names, UPI IDs, emails, and phone numbers.
9. **Persistence**: The redacted JSON is saved to MongoDB in the `Analysis` collection, and a system audit event `ANALYSIS_CREATED` is logged.
10. **Frontend Dashboard**: The backend returns the **unredacted** payload to the current user's session. The React app caches it locally and renders [ExpenseManager.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/ExpenseManager.jsx) and [RewardsPanel.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/RewardsPanel.jsx).

---

## 11. API Inventory

| Method | Route | Inputs | Outputs (JSON) | Middleware / Auth | Used By |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/login` | `{ password }` | `{ token }` | None | `AdminLogin.jsx` |
| `POST` | `/api/admin/change-password`| `{ currentPassword, newPassword }` | `{ success, token, [warning] }` | `requireAdmin` | `AdminSettingsModal.jsx` |
| `POST` | `/api/analyze` | Files (`multipart/form-data`), `pdfPasswords` (JSON map string) | Full unredacted Analysis Object | None | `UploadScreen.jsx` |
| `GET` | `/api/analyses` | None | Array of analysis summaries | `requireAdmin` | `AdminDashboard.jsx` |
| `GET` | `/api/stats` | None | `{ total_analyses, total_spend_tracked, avg_transactions, total_transactions, top_bank }` | `requireAdmin` | `AdminDashboard.jsx` |
| `GET` | `/api/analyses/:id` | Route Param: `id` | Single Analysis JSON | None | `App.jsx` (Load cached UUIDs) |
| `PUT` | `/api/analyses/:id` | Route Param: `id`, Body: Analysis JSON | `{ success: true }` | None | `App.jsx` (Syncs category edits) |
| `DELETE`| `/api/analyses/:id` | Route Param: `id` | `{ success: true }` | `requireAdmin` | `AdminDashboard.jsx` |
| `GET` | `/api/admin/audit-logs` | Query: `limit`, `offset` | `{ logs: [], total }` | `requireAdmin` | `AuditLogTab.jsx` |
| `GET` | `/api/admin/api-usage` | None | `{ daily: [], aggregate: {} }` | `requireAdmin` | `ApiUsageTab.jsx` |
| `POST` | `/api/admin/log-export` | None | `{ success: true }` | `requireAdmin` | `AdminDashboard.jsx` (Export CSV action) |
| `GET` | `/api/ping` | None | `{ status: "ok" }` | None | `apiService.js` |

---

## 12. Environment & Configuration

* **`PORT`**: Port number for backend Express (defaults to `3001`).
* **`MONGODB_URI`**: MongoDB Connection String (Atlas URI). If missing, DB defaults to temporary in-memory simulation but details do not persist.
* **`ADMIN_PASSWORD`**: String admin credential (defaults to `"admin123"`).
* **`GEMINI_API_KEY`**: Key for Google Generative AI APIs.
* **`GEMINI_PROXY_URL`** (Optional): Proxy endpoint to bypass regional API constraints.
* **`PROXY_SECRET`** (Optional): Header authentication secret for the proxy.
* **`VITE_API_URL`** (Frontend `.env`): Target API URL pointing to the Express server.

---

## 13. Dependency Graph & Important Files

### Core Dependency Chains
* **Frontend Entry**: `main.jsx` $\to$ `App.jsx`
  * Services: `App.jsx` $\to$ `geminiService.js` / `apiService.js` / `cacheService.js`
  * Core Components: `App.jsx` $\to$ `UploadScreen.jsx` / `ExpenseManager.jsx` $\to$ `RewardsPanel.jsx` / `Toast.jsx`
  * Admin Panel: `App.jsx` $\to$ `AdminLogin.jsx` / `AdminDashboard.jsx` $\to$ `ApiUsageTab.jsx` / `AuditLogTab.jsx`
* **Backend Entry**: `server.js`
  * DB Layer: `server.js` $\to$ `db.js`
  * AI Layer: `server.js` $\to$ `geminiService.js` $\to$ `db.js`
  * Security: `server.js` $\to$ `piiRedactor.js`

### Critical Files (Modify with Caution)
1. **[backend/server.js](file:///c:/Antigravity/expense/manager/backend/server.js)**: Coordinates file pipelines, WASM execution, and REST router configurations.
2. **[backend/geminiService.js](file:///c:/Antigravity/expense/manager/backend/geminiService.js)**: Configures API retry prompts, safety chains, and post-analysis category adjustments.
3. **[frontend/src/App.jsx](file:///c:/Antigravity/expense/manager/frontend/src/App.jsx)**: Router and state orchestrator for all components.
4. **[frontend/src/components/ExpenseManager.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/ExpenseManager.jsx)**: Core visualization dashboard containing category legends and interactive tables.

---

## 14. Performance & Technical Debt

### Performance Bottlenecks
* **WASM Decryption Latency**: Decrypting PDFs and rasterizing pages using WASM in Node is CPU-bound. In-memory rasterization of large PDFs can temporarily block the event loop.
* **Cold Starts on Host (Render)**: The backend web service on Render (free tier) spins down due to inactivity. Initial requests can take 30+ seconds to respond. The frontend has built-in ping retries to notify users.
* **Gemini Vision Payload Limits**: Sending large, high-res images can cause API network timeouts. Sharp's grayscale resizing acts as a mitigation, but massive PDF page-counts can still approach limits.

### Technical Debt
* **Lack of JWT Sessions**: The admin dashboard relies on `sessionStorage` containing the raw admin password string. A production setup should utilize JWT tokens with short lifetimes.
* **No Database Migrations**: Schema alterations are handled dynamically by Mongoose. Production updates require formal migration scripts.
* **Client-Side Data Mutability**: Edits made to expense categories directly alter parent data objects and sync back to the database, but do not update cached insights in real-time. Insights are only recalculated upon re-upload.

---

## 15. Development & Deployment Workflow

### Local Development Setup
1. **Database Setup**: Create a MongoDB Atlas cluster and acquire the connection URI.
2. **API Access**: Acquire a Gemini API Key from Google AI Studio.
3. **Backend Setup**:
   * Navigate to `backend/` and run `npm install`.
   * Create a `.env` file setting `GEMINI_API_KEY`, `MONGODB_URI`, `ADMIN_PASSWORD`, and `PORT`.
   * Run `npm run dev` to start the backend with watch mode.
4. **Frontend Setup**:
   * Navigate to `frontend/` and run `npm install`.
   * Create a `.env` setting `VITE_API_URL=http://localhost:3001/api` (if running backend locally on a different port).
   * Run `npm run dev` to start the Vite developer client.

### Deployment Process
* **Frontend**: Hosted on Vercel. Builds via `npm run build`, generating optimized static bundles inside `dist/`. Requires the `VITE_API_URL` environment variable pointing to the deployed backend.
* **Backend**: Deployed to Render as a Web Service. Root folder set to `backend/`. Requires environment variables: `GEMINI_API_KEY`, `MONGODB_URI`, and `ADMIN_PASSWORD`.
