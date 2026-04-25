const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * Send bank statement images to the backend for analysis.
 * @param {File[]} files - Array of image/PDF files
 * @param {Object} pdfPasswords - Map of filename -> password for encrypted PDFs
 * @returns {Promise<object>} - Parsed financial analysis JSON
 */
export async function analyzeStatements(files, pdfPasswords = {}) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  // Send PDF passwords as JSON if any were provided
  if (Object.keys(pdfPasswords).length > 0) {
    formData.append("pdfPasswords", JSON.stringify(pdfPasswords));
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
