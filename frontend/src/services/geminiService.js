const API_BASE = "/api";

/**
 * Send bank statement images to the backend for analysis.
 * @param {File[]} files - Array of image files
 * @returns {Promise<object>} - Parsed financial analysis JSON
 */
export async function analyzeStatements(files) {
  const formData = new FormData();
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
      if (parsedBody?.error) {
        throw new Error(parsedBody.error);
      }
    } catch (e) {
      if (e.message !== "Unexpected token < in JSON at position 0") {
        throw e;
      }
    }
    throw new Error(`Server error (${response.status}): ${errBody}`);
  }

  return await response.json();
}
