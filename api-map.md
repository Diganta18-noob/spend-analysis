# API Inventory & Specification — Spend Analysis

This document provides a detailed specification for all REST API endpoints exposed by the backend Express server.

---

## 1. Authentication & Security Middleware

### `requireAdmin` Middleware
* **Location**: `backend/server.js`
* **Logic**: Inspects the incoming request's headers for `Authorization`. If missing or not matching `Bearer <ADMIN_PASSWORD>`, it blocks the request.
* **Response on Failure**: HTTP `401 Unauthorized` with `{ error: "Unauthorized" }`.

---

## 2. API Endpoint Specifications

### `GET /api/ping`
* **Purpose**: Simple health check.
* **Auth Required**: No.
* **Inputs**: None.
* **Outputs (JSON)**:
  ```json
  { "status": "ok" }
  ```

---

### `POST /api/analyze`
* **Purpose**: Processes statement uploads, extracts data via the Gemini Vision API, and returns parsed JSON.
* **Auth Required**: No.
* **Inputs**: `multipart/form-data`
  * `files` (File array): Up to 10 image files or PDFs (max 10MB each).
  * `pdfPasswords` (JSON string, optional): Map of filenames to passwords. E.g., `"{ \"statement.pdf\": \"pass123\" }"`
* **Flow**:
  1. Multer stores files in memory.
  2. PDFs are converted to grayscale images using MuPDF WASM (using passwords if provided).
  3. Sharp compresses images.
  4. The Gemini Vision API parses the statement content.
  5. The output is validated (retrying if empty or misclassified).
  6. The database stores a redacted version (scrubbed by `piiRedactor.js`), and the action is logged.
  7. The server returns the **unredacted** payload to the current user's session.
* **Outputs (JSON)**:
  ```json
  {
    "id": "uuid-v4-string",
    "period": "01 Apr – 25 Apr 2026",
    "bank": "HDFC Bank",
    "account_holder": "John Doe",
    "opening_balance": 15230.50,
    "closing_balance": 12100.20,
    "total_credits": 2000.00,
    "total_reward_points": 250,
    "transactions": [
      {
        "date": "2026-04-02",
        "desc": "Zomato Food Delivery",
        "amount": 420.50,
        "cat": "Food & Dining",
        "reward_points": 8
      }
    ],
    "insights": [
      {
        "icon": "🍔",
        "title": "High Food Spend",
        "body": "Your food and dining expenses are 15% higher than average.",
        "badge": "Review",
        "color": "#f87171"
      }
    ]
  }
  ```

---

### `GET /api/analyses/:id`
* **Purpose**: Retrieves a saved analysis by ID.
* **Auth Required**: No.
* **Inputs**: Route Parameter `id` (UUID).
* **Outputs (JSON)**: Returns the redacted analysis object stored in the database.
  ```json
  {
    "id": "uuid-v4-string",
    "period": "01 Apr – 25 Apr 2026",
    "bank": "HDFC Bank",
    "account_holder": "REDACTED",
    "transactions": [...],
    "insights": [...]
  }
  ```

---

### `PUT /api/analyses/:id`
* **Purpose**: Updates an analysis record (used to sync user category corrections).
* **Auth Required**: No.
* **Inputs**: Route Parameter `id` (UUID), Body (JSON analysis payload).
* **Outputs (JSON)**:
  ```json
  { "success": true }
  ```

---

### `POST /api/admin/login`
* **Purpose**: Authenticates admin portal access.
* **Auth Required**: No.
* **Inputs**: Body
  ```json
  { "password": "yourpassword" }
  ```
* **Outputs (JSON)**:
  ```json
  { "token": "authenticated-password-string" }
  ```

---

### `POST /api/admin/change-password`
* **Purpose**: Updates the admin password and writes it to `.env`.
* **Auth Required**: Yes (`requireAdmin`).
* **Inputs**: Body
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "newsecurepassword"
  }
  ```
* **Outputs (JSON)**:
  ```json
  {
    "success": true,
    "token": "newsecurepassword"
  }
  ```

---

### `GET /api/analyses`
* **Purpose**: Retrieves a list of all parsed analyses (excluding full transaction arrays to reduce size).
* **Auth Required**: Yes (`requireAdmin`).
* **Inputs**: None.
* **Outputs (JSON)**:
  ```json
  [
    {
      "id": "uuid-v4-string",
      "created_at": "2026-06-23T19:31:36Z",
      "period": "01 Apr – 25 Apr 2026",
      "bank": "HDFC Bank",
      "account_holder": "REDACTED",
      "total_spent": 1420.50,
      "transaction_count": 8,
      "is_redacted": true
    }
  ]
  ```

---

### `GET /api/stats`
* **Purpose**: Retrieves aggregate database statistics for the admin dashboard.
* **Auth Required**: Yes (`requireAdmin`).
* **Inputs**: None.
* **Outputs (JSON)**:
  ```json
  {
    "total_analyses": 14,
    "total_spend_tracked": 128450.20,
    "avg_transactions": 12,
    "total_transactions": 168,
    "top_bank": "HDFC Bank"
  }
  ```

---

### `DELETE /api/analyses/:id`
* **Purpose**: Deletes an analysis record.
* **Auth Required**: Yes (`requireAdmin`).
* **Inputs**: Route Parameter `id`.
* **Outputs (JSON)**:
  ```json
  { "success": true }
  ```

---

### `GET /api/admin/audit-logs`
* **Purpose**: Retrieves the system activity log.
* **Auth Required**: Yes (`requireAdmin`).
* **Inputs**: Query parameters `limit` (default: 50), `offset` (default: 0).
* **Outputs (JSON)**:
  ```json
  {
    "logs": [
      {
        "id": "1719171096123",
        "timestamp": "2026-06-23T19:31:36Z",
        "action": "ADMIN_LOGIN",
        "details": "Admin logged in successfully",
        "ip": "127.0.0.1"
      }
    ],
    "total": 1
  }
  ```

---

### `GET /api/admin/api-usage`
* **Purpose**: Retrieves daily Gemini API performance and latency metrics.
* **Auth Required**: Yes (`requireAdmin`).
* **Inputs**: None.
* **Outputs (JSON)**:
  ```json
  {
    "daily": [
      {
        "date": "2026-06-23",
        "provider": "gemini",
        "total_calls": 8,
        "successful_calls": 7,
        "failed_calls": 1,
        "total_tokens_estimated": 15000,
        "latencies": [4210, 3900],
        "errors": []
      }
    ],
    "aggregate": {
      "total_calls": 8,
      "successful_calls": 7,
      "failed_calls": 1,
      "total_tokens_estimated": 15000,
      "avg_latency_ms": 4055
    }
  }
  ```

---

### `POST /api/admin/log-export`
* **Purpose**: Logs a CSV export action to the audit logs.
* **Auth Required**: Yes (`requireAdmin`).
* **Inputs**: None.
* **Outputs (JSON)**:
  ```json
  { "success": true }
  ```
