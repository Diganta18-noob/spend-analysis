# Architecture — Spend Analysis

This document provides a deep dive into the system architecture of the **Spend Analysis** application. It details component interactions, security layers, and data-transformation processes.

---

## 1. System Interaction Map

```
                             [ USER AGENT (Client Browser) ]
                                            │
           (Initial Load)                   │ (API Requests / File Uploads)
       ┌────────────────────────────────────┼────────────────────────────────────┐
       ▼                                    ▼                                    ▼
┌──────────────┐                     ┌──────────────┐                     ┌──────────────┐
│  React App   │                     │ Express Host │                     │ MongoDB Atlas│
│  Static CDN  │                     │   (Render)   │                     │  (Database)  │
└──────────────┘                     └──────────────┘                     └──────────────┘
                                            │                                    ▲
                                            │ (Call Gemini vision API)           │ (Store Redacted)
                                            ▼                                    │
                                     ┌──────────────┐                            │
                                     │  Gemini API  │ ───────────────────────────┘
                                     └──────────────┘
```

---

## 2. Ingestion Pipeline & Data Processing Architecture

Processing statement documents requires a multi-step, resources-optimized pipeline. This ensures compatibility with the Gemini Vision APIs and mitigates API timeouts.

```
[ PDF or Image Document Ingested ]
               │
               ▼
 ┌───────────────────────────┐
 │   Multer Memory Ingestion  │
 └───────────────────────────┘
               │
               ▼ Is PDF?
         ┌─────┴─────┐
         ▼ Yes       ▼ No
   ┌───────────┐     │
   │ MuPDF     │     │
   │ WASM      │     │
   │ Decrypter │     │
   └─────┬─────┘     │
         │ (Render)  │
         ▼           ▼
   ┌───────────────────┐
   │ Sharp Compressor  │ <== Grayscale & Scale reduction
   └─────────┬─────────┘
             │
             ▼ Grayscale JPEG Buffers
   ┌───────────────────┐
   │ Gemini API Call   │
   └─────────┬─────────┘
             │
             ▼ JSON Response
   ┌───────────────────┐
   │ piiRedactor Logic │ ──► [ MongoDB Analysis Collection ]
   └─────────┬─────────┘
             │
             ▼ Unredacted JSON response
   [ Frontend UI Render ]
```

### PDF Decryption & Processing (MuPDF WASM)
When a PDF statement is uploaded, the backend runs `convertPdfToImages` in `backend/server.js`:
1. **Security Handshake**: The document is opened using WASM-compiled **MuPDF**. If encrypted, it attempts authentication using the user's password.
2. **Page Rasterization**: Pages are rendered using pixel maps. The rasterization scale is dynamically calculated based on the total page count to prevent payload bloating.
3. **Memory Management**: Pixel maps are converted to PNG byte arrays and then immediately destroyed in WASM memory to prevent memory leaks.

### Image Optimization (Sharp)
All image buffers (whether uploaded directly or rasterized from PDFs) pass through **Sharp** compression in `backend/server.js:compressImage`:
1. **Grayscale Conversion**: Images are converted to grayscale to drop color channels. This significantly reduces file size (typically by 60%+) while retaining text clarity.
2. **Dimension Constraints**: High-resolution images are scaled down to a maximum dimension of 2000px, which speeds up Gemini processing.
3. **JPEG Compression**: The pipeline outputs compressed JPEGs (80% quality), resulting in a compact payload for the Gemini API.

---

## 3. Gemini Fallback & Correction Mechanism

To ensure reliability, the backend uses a robust retry and fallback mechanism inside `backend/geminiService.js`:

```
   [ Execute API Request ] ◄───────────────────────────────────┐
              │                                                │
      ┌───────┴───────┐                                        │
      ▼ Success       ▼ Error / Failure                        │ (Retry with new model)
  [ Verify JSON ]     [ Quota / Location / Timeout Block ]     │
      │       │                        │                       │
      │ OK    │ (Empty/Bad Category)   ▼                       │
      │       └────────────────► [ Fallback Model Chain ] ─────┘
      ▼                                │ (All models failed)
[ Return Data ]                        ▼
                             [ Throw Server Error ]
```

* **Model Fallback Chain**: Starts with `gemini-3.5-flash` and falls back down to `gemini-2.0-flash-lite` if the primary model is throttled or rate-limited.
* **Dominant Category Detection**: If $\ge 5$ transactions are returned and all have the exact same category, the pipeline flags a misclassification. It automatically retries up to 2 times with a modified retry prompt and increased temperature.
* **Auto-Fix Keyword Fallback**: If the output is still misclassified, a local rule-based corrector updates categories based on common merchant keywords.

---

## 4. Privacy & Data Protection Architecture

Privacy is maintained through a strict separation between in-memory user sessions and persistent storage:

```
[ Extracted Bank Statement Data ]
               │
       ┌───────┴───────┐
       ▼               ▼
 [ Active Session ]  [ piiRedactor.js ]
       │               │
       ▼ (Unredacted)  ▼ (UPI, Name, Email, Balance Scrubbed)
 [ User Dashboard ]  [ MongoDB Atlas Store ]
```

1. **Active Session (Client-side)**: The frontend receives the unredacted analysis, displaying complete transaction descriptions, balances, and names. This data is only stored in the browser's `localStorage` and `sessionStorage`.
2. **Persistent Storage (Server-side)**: The database only stores a redacted copy. The account holder's name is replaced with `"REDACTED"`, balances are deleted, and sensitive details in transaction descriptions (UPI IDs, account numbers, email addresses) are masked via regex before database insertion.
