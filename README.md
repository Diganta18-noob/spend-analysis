<p align="center">
  <img src="https://img.shields.io/badge/%F0%9F%92%B8-Spend_Analysis-FFB800?style=for-the-badge&labelColor=0D1117" alt="Spend Analysis" />
</p>

<h1 align="center">
  <br>
  💸 Spend Analysis
  <br>
</h1>

<p align="center">
  <strong>AI-Powered Bank Statement Analyzer — Upload. Analyze. Understand.</strong>
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/Features-8B5CF6?style=flat-square&logo=sparkles&logoColor=white" alt="Features" /></a>
  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Tech_Stack-3B82F6?style=flat-square&logo=stackblitz&logoColor=white" alt="Tech Stack" /></a>
  <a href="#-getting-started"><img src="https://img.shields.io/badge/Quick_Start-10B981?style=flat-square&logo=rocket&logoColor=white" alt="Quick Start" /></a>
  <a href="#-api-reference"><img src="https://img.shields.io/badge/API_Docs-F59E0B?style=flat-square&logo=swagger&logoColor=white" alt="API Docs" /></a>
  <a href="#-deployment"><img src="https://img.shields.io/badge/Deploy-EF4444?style=flat-square&logo=vercel&logoColor=white" alt="Deploy" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Gemini-Flash-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini" />
</p>

<br>

---

<br>

## 🧠 What Is This?

**Spend Analysis** is a full-stack, AI-powered personal finance tool that reads your bank statement screenshots or PDFs, extracts every debit transaction using **Google Gemini's vision capabilities**, and generates a beautiful, interactive spend dashboard — all in under 30 seconds.

> **No manual data entry. No CSV parsing headaches. Just upload and go.**

<br>

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 Smart Dashboard
- Donut chart for category-wise breakdown
- Daily bar chart with spike detection
- 4 stat cards: Total Debited, Top Category, Daily Avg, Peak Day
- Category legend with interactive filtering

</td>
<td width="50%">

### 🤖 AI-Powered Extraction
- Uses **Gemini 2.0 Flash** with vision
- Extracts every debit from screenshots & PDFs
- Auto-categorizes into 14 smart categories
- Generates 6–8 data-driven insights

</td>
</tr>
<tr>
<td width="50%">

### 🔐 Privacy-First Design
- PII redaction before database storage
- Account numbers, names & balances auto-scrubbed
- Full data shown only during active session
- No raw financial data persisted

</td>
<td width="50%">

### 🛡️ Admin Dashboard
- Full analysis history with search
- Audit log tracking (login, views, exports)
- API usage monitoring & latency stats
- CSV export with audit trail
- Password management

</td>
</tr>
<tr>
<td width="50%">

### 📄 Advanced PDF Support
- Password-protected PDF handling
- Multi-page PDF → image conversion via **MuPDF**
- In-browser password prompt with retry UX
- Supports PNG, JPG, WEBP & PDF

</td>
<td width="50%">

### ✏️ Editable Categories
- Click any category pill to re-classify
- Batch update: apply to all matching transactions
- Changes sync to backend in real-time
- Toast confirmation with one-click undo

</td>
</tr>
</table>

<br>

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Vite + React 19)        │
│                                                     │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │  Upload   │  │   Expense     │  │    Admin     │  │
│  │  Screen   │→ │   Manager     │  │  Dashboard   │  │
│  │          │  │  (Charts +    │  │  (Logs,      │  │
│  │  Drag &  │  │   Tables)     │  │   Stats)     │  │
│  │  Drop    │  │               │  │              │  │
│  └──────────┘  └───────────────┘  └──────────────┘  │
│       │               ↑                    ↑        │
└───────│───────────────│────────────────────│────────┘
        │               │                    │
        ▼               │                    │
┌─────────────────────────────────────────────────────┐
│                 BACKEND (Express 5 + Node.js)       │
│                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │   Multer   │  │   MuPDF    │  │   PII        │   │
│  │  (Upload)  │→ │ (PDF→PNG)  │→ │  Redactor    │   │
│  └────────────┘  └────────────┘  └──────────────┘   │
│        │                                ↓           │
│        ▼         ┌─────────────────────────────┐    │
│  ┌────────────┐  │      MongoDB Atlas          │    │
│  │  Gemini    │  │  ┌──────────┐ ┌──────────┐  │    │
│  │  Flash API │  │  │ Analyses │ │  Audit   │  │    │
│  │  (Vision)  │  │  │          │ │  Logs    │  │    │
│  └────────────┘  │  └──────────┘ └──────────┘  │    │
│                  └─────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

<br>

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | React 19 + Vite 8 | SPA with hash-based routing |
| **Charts** | Recharts | Pie charts, bar charts, tooltips |
| **Icons** | Lucide React | Crisp, consistent SVG icons |
| **Backend** | Express 5 | REST API with file upload handling |
| **AI Engine** | Google Gemini Flash | Vision-based OCR + transaction extraction |
| **PDF Engine** | MuPDF (WASM) | PDF decryption + page-to-image conversion |
| **Database** | MongoDB Atlas (Mongoose 9) | Persistent storage for analyses & audit logs |
| **File Upload** | Multer (in-memory) | Multi-file upload with 10MB limit |
| **Privacy** | Custom PII Redactor | Strips names, accounts, UPI IDs, emails |
| **Hosting** | Vercel + Render | Frontend on Vercel, Backend on Render |

<br>

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|:------------|:--------|
| Node.js | `≥ 18.x` |
| npm | `≥ 9.x` |
| Gemini API Key | [Get one here →](https://aistudio.google.com/apikey) |
| MongoDB Atlas | [Free cluster →](https://www.mongodb.com/atlas) |

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Diganta18-noob/spend-analysis.git
cd spend-analysis
```

### 2️⃣ Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/expense-manager
ADMIN_PASSWORD=your_secure_password
PORT=3001
```

Start the backend:

```bash
npm run dev
```

### 3️⃣ Setup the Frontend

```bash
cd frontend
npm install
```

> **Note:** The frontend expects the backend at `http://localhost:3001` by default. For production, set the `VITE_API_URL` environment variable.

Start the frontend:

```bash
npm run dev
```

### 4️⃣ Open the app

Navigate to `http://localhost:5173` — you're all set! 🎉

<br>

## 📡 API Reference

<details>
<summary><strong>🟢 POST</strong> <code>/api/analyze</code> — Analyze bank statements</summary>

**Body:** `multipart/form-data`

| Field | Type | Description |
|:------|:-----|:------------|
| `files` | `File[]` | Up to 10 images or PDFs |
| `pdfPasswords` | `JSON string` | `{ "filename.pdf": "password" }` |

**Response:**
```json
{
  "id": "uuid",
  "period": "01 Apr – 25 Apr 2026",
  "bank": "Bank of India",
  "transactions": [...],
  "insights": [...]
}
```
</details>

<details>
<summary><strong>🟢 GET</strong> <code>/api/analyses/:id</code> — Get analysis by ID</summary>

Returns the full analysis data including all transactions and insights.
</details>

<details>
<summary><strong>🟡 PUT</strong> <code>/api/analyses/:id</code> — Update analysis</summary>

Used for category edits — syncs updated transaction data back to the server.
</details>

<details>
<summary><strong>🔴 DELETE</strong> <code>/api/analyses/:id</code> — Delete analysis (Admin)</summary>

Requires `Authorization: Bearer <admin_password>` header.
</details>

<details>
<summary><strong>🔒 Admin Endpoints</strong></summary>

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/api/admin/login` | Admin authentication |
| `POST` | `/api/admin/change-password` | Update admin password |
| `GET` | `/api/analyses` | List all analyses |
| `GET` | `/api/stats` | Aggregate statistics |
| `GET` | `/api/admin/audit-logs` | View audit trail |
| `GET` | `/api/admin/api-usage` | API call metrics |
| `POST` | `/api/admin/log-export` | Log CSV export action |
</details>

<br>

## 🌐 Deployment

### Frontend → Vercel

```bash
# From the frontend directory
npx vercel --prod
```

Set the environment variable:
```
VITE_API_URL=https://your-backend.onrender.com
```

### Backend → Render

1. Create a **Web Service** on [Render](https://render.com)
2. Set the root directory to `backend/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables: `GEMINI_API_KEY`, `MONGODB_URI`, `ADMIN_PASSWORD`, and `JWT_SECRET`. Set `JWT_SECRET` to a unique random value of at least 32 characters and keep it stable across deploys. Changing it invalidates existing sign-in tokens.

### Statement accuracy

The ICICI Amazon Pay credit-card PDF format with selectable text is parsed directly. Transaction pages are separated from explanatory pages, and extracted debits, credits, previous balance, and amount due must reconcile to printed statement totals before the direct result is accepted. Other layouts use page extraction and remain unverified when totals or source rows cannot be checked. Incoming payments and deposits are not refunds; only identified merchant refunds and adjustments reduce spending. Correct uncertain credit purposes in Transactions. AI-generated insights are withheld when extraction needs review and may be unavailable separately when the API quota is exhausted. A balanced statement verifies arithmetic, not every merchant category, so review categories before relying on them.

<br>

## 📁 Project Structure

```
spend-analysis/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main app with hash routing
│   │   ├── components/
│   │   │   ├── UploadScreen.jsx       # Drag & drop file upload
│   │   │   ├── ExpenseManager.jsx     # Dashboard with charts & tables
│   │   │   ├── Toast.jsx              # Category edit notifications
│   │   │   └── admin/
│   │   │       ├── AdminLogin.jsx     # Admin authentication
│   │   │       ├── AdminDashboard.jsx # Analysis management
│   │   │       ├── AdminSettingsModal.jsx
│   │   │       ├── ApiUsageTab.jsx    # Gemini API monitoring
│   │   │       ├── AuditLogTab.jsx    # Activity tracking
│   │   │       └── ConfirmToast.jsx
│   │   ├── services/
│   │   │   ├── geminiService.js       # Frontend API client
│   │   │   ├── apiService.js          # Backend API helpers
│   │   │   └── cacheService.js        # Local storage caching
│   │   └── data/
│   │       └── sampleData.js          # Demo dataset
│   └── package.json
│
├── backend/
│   ├── server.js                      # Express app & routes
│   ├── geminiService.js               # Gemini API integration
│   ├── db.js                          # MongoDB models & queries
│   ├── piiRedactor.js                 # Privacy data scrubbing
│   └── package.json
│
└── docs/                              # Internal documentation
```

<br>

## 🔒 Privacy & Security

| Feature | Implementation |
|:--------|:---------------|
| **PII Redaction** | Account holder names replaced with `REDACTED` before DB write |
| **Balance Scrubbing** | Opening/closing balances & credits stripped from stored data |
| **UPI ID Masking** | `user@okhdfcbank` → `***@upi` |
| **Number Masking** | 10+ digit numbers (account/phone/Aadhar) → `**********` |
| **Email Masking** | Email addresses → `***@***.***` |
| **Session Isolation** | Full data visible only during active upload session |
| **Audit Trail** | Every login, view, edit, delete & export is logged with IP |

<br>

## 📊 Expense Categories

| Category | Icon | Examples |
|:---------|:-----|:---------|
| Rent | 🏠 | Monthly rent payments |
| Insurance | 🛡️ | Health, life, vehicle insurance |
| Food & Dining | 🥘 | Restaurants, delivery, street food |
| Office Food | 🍽️ | Canteen, cafeteria, work lunches |
| Transport | 🚕 | Cab, auto, metro, bus |
| Groceries | 🛒 | Supermarket, daily essentials |
| Bills & Subscriptions | 📱 | Phone, Netflix, utilities |
| Personal Transfer | 👥 | UPI transfers to individuals |
| Self Transfer | 🔁 | Own account transfers (togglable) |
| Entertainment | 🎬 | Movies, events, games |
| Shopping | 🛍️ | Online/offline shopping |
| Healthcare | 🏥 | Medical, pharmacy, hospital |
| Education | 📚 | Courses, books, fees |
| Other | 📌 | Uncategorized transactions |

<br>

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** this repository
2. **Create** a feature branch: `git checkout -b feat/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feat/amazing-feature`
5. **Open** a Pull Request

<br>

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

<br>

---

<p align="center">
  <sub>Built with ❤️ and ☕ by <a href="https://github.com/Diganta18-noob">Diganta</a></sub>
</p>

<p align="center">
  <a href="https://github.com/Diganta18-noob/spend-analysis/stargazers">
    <img src="https://img.shields.io/github/stars/Diganta18-noob/spend-analysis?style=social" alt="Stars" />
  </a>
  <a href="https://github.com/Diganta18-noob/spend-analysis/network/members">
    <img src="https://img.shields.io/github/forks/Diganta18-noob/spend-analysis?style=social" alt="Forks" />
  </a>
</p>
