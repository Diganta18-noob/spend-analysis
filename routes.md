# Routes Map — Spend Analysis

This document details the routing maps for both the frontend client and the backend server.

---

## 1. Client Routing Map (Hash-based)

The frontend uses standard hash-based routing. Routes are parsed and managed by the main application component in [App.jsx](file:///c:/Antigravity/expense/manager/frontend/src/App.jsx).

| Hash Route | Rendered Component | Auth Required | Purpose | Input / Dependency |
| :--- | :--- | :--- | :--- | :--- |
| `#/` | [UploadScreen.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/UploadScreen.jsx) | No | Land/Upload panel. Houses file dropzones, password modals, and error banners. | Triggers `/api/analyze` post requests on file drop. |
| `#/dashboard` | [ExpenseManager.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/ExpenseManager.jsx) | No (Uses Session Data) | Spending analytics dashboard with interactive charts, transaction tables, and insights. | Expects `data` payload. Automatically redirects to `#/` if session data is missing. |
| `#/admin/login` | [AdminLogin.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/admin/AdminLogin.jsx) | No | Gatekeeping portal for administrative entry. | Accepts the admin password string. |
| `#/admin/dashboard`| [AdminDashboard.jsx](file:///c:/Antigravity/expense/manager/frontend/src/components/admin/AdminDashboard.jsx) | Yes (`admin_token`) | Admin control center tracking audit logs, system latency, and transaction history. | Expects `admin_token` inside browser `sessionStorage`. |

---

## 2. Server API Routing Map

Defined in [server.js](file:///c:/Antigravity/expense/manager/backend/server.js). The Express server processes multipart forms, updates data, and handles security logic.

| Method | Endpoint | Description | Middleware / Auth | Used By |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/ping` | Simple server sanity check. | None | `apiService.js` |
| `POST` | `/api/analyze` | Receives statement files, processes them, calls the Gemini API, and returns parsed JSON. | Multer upload parser | `UploadScreen.jsx` |
| `GET` | `/api/analyses/:id` | Fetches a single analysis record by ID. | None | `App.jsx` |
| `PUT` | `/api/analyses/:id` | Updates a transaction category in the database. | None | `App.jsx` |
| `DELETE`| `/api/analyses/:id` | Deletes an analysis record from the database. | `requireAdmin` | `AdminDashboard.jsx` |
| `POST` | `/api/admin/login` | Validates the admin password. | None | `AdminLogin.jsx` |
| `POST` | `/api/admin/change-password` | Updates the admin password. | `requireAdmin` | `AdminSettingsModal.jsx` |
| `GET` | `/api/analyses` | Retrieves all analysis records. | `requireAdmin` | `AdminDashboard.jsx` |
| `GET` | `/api/stats` | Retrieves aggregate metrics (total spend, transaction count, top bank). | `requireAdmin` | `AdminDashboard.jsx` |
| `GET` | `/api/admin/audit-logs` | Retrieves system audit logs. | `requireAdmin` | `AuditLogTab.jsx` |
| `GET` | `/api/admin/api-usage` | Retrieves API latency and consumption logs. | `requireAdmin` | `ApiUsageTab.jsx` |
| `POST` | `/api/admin/log-export` | Logs a CSV export action to the audit logs. | `requireAdmin` | `AdminDashboard.jsx` |
