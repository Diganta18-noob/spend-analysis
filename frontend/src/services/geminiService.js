const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * Send bank statement images to the backend for analysis.
 * @param {File[]} files - Array of image/PDF files
 * @param {Object} pdfPasswords - Map of filename -> password for encrypted PDFs
 * @returns {Promise<object>} - Parsed financial analysis JSON
 */
export async function analyzeStatements(files, pdfPasswords = {}) {
  const formData = new FormData();

  // Send PDF passwords as JSON if any were provided
  if (Object.keys(pdfPasswords).length > 0) {
    formData.append("pdfPasswords", JSON.stringify(pdfPasswords));
  }

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text();
    try {
      const parsedBody = JSON.parse(errBody);
      // Propagate the full error object for password-related errors
      if (parsedBody?.error === "PDF_PASSWORD_REQUIRED" || parsedBody?.error === "PDF_PASSWORD_INCORRECT") {
        const err = new Error(parsedBody.message);
        err.code = parsedBody.error;
        err.fileName = parsedBody.fileName;
        err.fileIndex = parsedBody.fileIndex;
        throw err;
      }
      if (parsedBody?.error) {
        throw new Error(parsedBody.error);
      }
    } catch (e) {
      if (e.code === "PDF_PASSWORD_REQUIRED" || e.code === "PDF_PASSWORD_INCORRECT") throw e;
      if (e.message !== "Unexpected token < in JSON at position 0") {
        throw e;
      }
    }
    throw new Error(`Server error (${response.status}): ${errBody}`);
  }

  return await response.json();
}

/**
 * Send bank statement images/PDFs to backend v2 SSE analysis stream.
 * @param {File[]} files - Array of files
 * @param {Object} pdfPasswords - Map of filename -> password
 * @param {Function} onProgress - Callback function that receives { event, data }
 * @returns {Promise<object>} - The final analysis result
 */
export async function analyzeStatementsV2(files, pdfPasswords = {}, onProgress) {
  const formData = new FormData();

  if (Object.keys(pdfPasswords).length > 0) {
    formData.append("pdfPasswords", JSON.stringify(pdfPasswords));
  }

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_BASE}/v2/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text();
    try {
      const parsedBody = JSON.parse(errBody);
      if (parsedBody?.error === "PDF_PASSWORD_REQUIRED" || parsedBody?.error === "PDF_PASSWORD_INCORRECT") {
        const err = new Error(parsedBody.message);
        err.code = parsedBody.error;
        err.fileName = parsedBody.fileName;
        err.fileIndex = parsedBody.fileIndex;
        throw err;
      }
      if (parsedBody?.error) {
        throw new Error(parsedBody.error);
      }
    } catch (e) {
      if (e.code === "PDF_PASSWORD_REQUIRED" || e.code === "PDF_PASSWORD_INCORRECT") throw e;
      if (e.message !== "Unexpected token < in JSON at position 0") {
        throw e;
      }
    }
    throw new Error(`Server error (${response.status}): ${errBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split("\n\n");
    buffer = messages.pop();

    for (const msg of messages) {
      if (!msg.trim()) continue;

      let event = "";
      let dataStr = "";

      const lines = msg.split("\n");
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          event = line.substring(7).trim();
        } else if (line.startsWith("data: ")) {
          dataStr = line.substring(6).trim();
        }
      }

      if (event && dataStr) {
        let data = {};
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          console.error("Failed to parse SSE data string", dataStr, e);
        }

        if (event === "error") {
          const err = new Error(data.message || "Analysis failed");
          if (data.code === "PDF_PASSWORD_REQUIRED" || data.code === "PDF_PASSWORD_INCORRECT") {
            err.code = data.code;
            err.fileName = data.fileName;
            err.fileIndex = data.fileIndex;
          }
          throw err;
        }

        if (event === "done") {
          return data;
        }

        if (onProgress) {
          onProgress({ event, data });
        }
      }
    }
  }

  throw new Error("Stream closed before completion");
}

