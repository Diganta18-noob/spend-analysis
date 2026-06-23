import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/**
 * Middleware that runs AFTER Multer. Inspects each uploaded buffer's magic
 * bytes to verify it really is a PDF, PNG, JPEG, or WebP — regardless of
 * what extension the user named the file.
 */
export async function validateFileTypes(req, res, next) {
  if (!req.files || req.files.length === 0) {
    return next(); // No files — let the route handler decide whether that's ok
  }

  for (const file of req.files) {
    const detected = await fileTypeFromBuffer(file.buffer);

    // file-type returns undefined for unknown/text files
    if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
      return res.status(400).json({
        error: "INVALID_FILE_TYPE",
        message: `"${file.originalname}" is not an accepted file type. Allowed: PDF, PNG, JPEG, WebP.`,
        fileName: file.originalname,
        detected: detected?.mime ?? "unknown",
      });
    }

    // Normalise the mimetype to what we actually detected (defuse spoofed extensions)
    file.mimetype = detected.mime;
  }

  next();
}
