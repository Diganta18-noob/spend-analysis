# Dependency Graph & High Impact Files — Spend Analysis

This document details import dependencies, service connections, and flags critical files that should not be modified lightly.

---

## 1. Import Dependency Graph

### Frontend Application Imports

```
   [ main.jsx ]
        │
        ▼
    [ App.jsx ] ───────────────────────────────────────────┐
        │                                                  │
        ├─► [ UploadScreen.jsx ]                           ├─► [ services/cacheService.js ]
        ├─► [ ExpenseManager.jsx ] ──► [ RewardsPanel.jsx ] ├─► [ services/apiService.js ]
        │                                                  └─► [ services/geminiService.js ]
        ├─► [ admin/AdminLogin.jsx ]
        └─► [ admin/AdminDashboard.jsx ]
                 │
                 ├─► [ admin/AdminSettingsModal.jsx ]
                 ├─► [ admin/ApiUsageTab.jsx ]
                 ├─► [ admin/AuditLogTab.jsx ]
                 └─► [ admin/ConfirmToast.jsx ]
```

### Backend Application Imports

```
              [ server.js ]
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  [ db.js ]   [ piiRedactor.js ]  [ geminiService.js ]
                                        │
                                        ▼
                                    [ db.js ]
```

---

## 2. Critical High-Impact Files

Below is a catalog of files that are core to the system's stability.

| File Path | Responsibility | Risks on Modification |
| :--- | :--- | :--- |
| [frontend/src/App.jsx](file:///c:/Antigravity/expense/manager/frontend/src/App.jsx) | Router, global state, LocalStorage cache sync, and transaction modification handlers. | Breaking this file breaks routing, user session cache retrieval, and client-server syncing. |
| [backend/server.js](file:///c:/Antigravity/expense/manager/backend/server.js) | Handles Multer uploads, WASM PDF decryption, and Sharp grayscaling/compression. | Modifications can cause memory leaks, PDF decryption failures, or oversized image uploads that timeout the Gemini API. |
| [backend/geminiService.js](file:///c:/Antigravity/expense/manager/backend/geminiService.js) | Handles the API retry prompt loops, safety thresholds, and rule-based keyword classifications. | Minor syntax or prompt edits can result in failed Gemini responses, empty outputs, or miscategorized expenses. |
| [backend/db.js](file:///c:/Antigravity/expense/manager/backend/db.js) | Mongoose schemas and database query handlers. | Breaking schemas or exports will crash DB initialization, preventing statements from saving or admin audits from loading. |
| [backend/piiRedactor.js](file:///c:/Antigravity/expense/manager/backend/piiRedactor.js) | Cleans UPI IDs, account holder names, exact balances, and account numbers prior to MongoDB insertions. | Faults here can lead to leaks of sensitive financial data (PII) into persistent storage. |
