/**
 * Sentry integration — completely no-op if SENTRY_DSN is not set.
 */
let Sentry = null;

export function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log("[Sentry] SENTRY_DSN not set — error tracking disabled.");
    return;
  }

  try {
    // Dynamic import keeps the bundle clean when Sentry is unused
    Sentry = await import("@sentry/node");
    Sentry.init({ dsn, tracesSampleRate: 0.2 });
    console.log("[Sentry] Initialized successfully.");
  } catch (err) {
    console.warn("[Sentry] Failed to initialize:", err.message);
  }
}

export function sentryErrorHandler() {
  if (Sentry?.setupExpressErrorHandler) {
    // Returns a proper Express error middleware array
    return (err, req, res, next) => {
      Sentry.captureException(err);
      next(err);
    };
  }
  // No-op middleware when Sentry is not loaded
  return (_err, _req, _res, next) => next(_err);
}

export function captureException(err) {
  if (Sentry?.captureException) {
    Sentry.captureException(err);
  }
}
