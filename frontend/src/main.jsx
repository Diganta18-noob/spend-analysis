import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './components/auth/AuthProvider.jsx'

// --- Sentry (no-op if VITE_SENTRY_DSN is not set) ---
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.2 });
    console.log('[Sentry] Frontend error tracking enabled.');
  }).catch(() => {
    // Sentry failed to load — not critical, proceed without it
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

