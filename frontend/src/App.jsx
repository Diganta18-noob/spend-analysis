import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { SignInButton, UserButton } from '@clerk/clerk-react';
import UploadScreen from './components/UploadScreen';
import HistoryScreen from './components/HistoryScreen';
import PortalShell from './components/layout/PortalShell';
import { Button, Skeleton } from './components/ui/PortalUI';
import { useAuth } from './components/auth/AuthProvider';
import { analyzeStatementsV2 } from './services/geminiService';
import { clearAnalysis } from './services/cacheService';
import { useAnalysisPersistence } from './hooks/useAnalysisPersistence';
import { SAMPLE_DATA } from './data/sampleData';
import './portal.css';
const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const ExpenseManager = lazy(() => import('./components/ExpenseManager'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const views = ['overview', 'transactions', 'vendors', 'insights', 'rewards'];
export default function App() {
  const { userId } = useAuth();
  // Remount financial state on sign-out or account switch so another user cannot see it.
  return <WorkspaceApp key={userId || 'anonymous'} />;
}
function WorkspaceApp() {
  const analysisRequest = useRef(null);
  useEffect(() => () => analysisRequest.current?.abort(), []);
  const [route, setRoute] = useState(window.location.hash || '#/');
  const [data, setData] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [loading, setLoading] = useState(false); const [progress, setProgress] = useState(''); const [error, setError] = useState('');
  const { getToken, isClerkEnabled, isSignedIn } = useAuth();
  const persistence = useAnalysisPersistence({ analysis: data, onChange: setData, getToken });
  useEffect(() => { clearAnalysis(); }, []);
  useEffect(() => { localStorage.setItem('theme', theme); document.documentElement.classList.toggle('light-mode', theme === 'light'); }, [theme]);
  useEffect(() => {
    const changed = () => {
      const next = window.location.hash || '#/';
      setRoute(next);
      // Preserve existing behavior: clear only on explicit navigation away.
      if (!next.startsWith('#/admin')) sessionStorage.removeItem('admin_token');
    };
    window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed);
  }, []);
  const navigate = view => { window.location.hash = view === 'upload' ? '#/' : view === 'history' ? '#/history' : `#/dashboard/${view}`; };
  async function analyze(files, passwords) {
    analysisRequest.current?.abort();
    const controller = new AbortController();
    analysisRequest.current = controller;
    setError(''); setLoading(true); setProgress('Preparing your statement…');
    try {
      const token = await getToken();
      if (controller.signal.aborted) return;
      if (isSignedIn && !token) throw new Error('Sign in again before analyzing to save your history.');
      const result = await analyzeStatementsV2(files, passwords, ({ event, data: update }) => {
        if (event === 'page_converted') setProgress(`Converting ${update.file}: page ${update.page} of ${update.total}`);
        if (event === 'page_extracted') setProgress(`Extracting page ${update.index} of ${update.total} · ${update.transactionsCount} transactions found`);
        if (event === 'finalizing') setProgress(update.message || 'Checking quality and generating insights…');
      }, token, controller.signal);
      if (controller.signal.aborted) return;
      setData(result); navigate('overview');
    } catch (failure) { if (!controller.signal.aborted) setError(`${failure.code ? failure.code + ': ' : ''}${failure.message}`); }
    finally { if (analysisRequest.current === controller && !controller.signal.aborted) { setLoading(false); setProgress(''); } }
  }
  const toggleTheme = () => setTheme(value => value === 'dark' ? 'light' : 'dark');
  if (route.startsWith('#/admin')) {
    const hasToken = !!sessionStorage.getItem('admin_token');
    return <Suspense fallback={<Skeleton label="Opening administration…" />}>{hasToken ? <AdminDashboard theme={theme} toggleTheme={toggleTheme} /> : <AdminLogin theme={theme} toggleTheme={toggleTheme} />}</Suspense>;
  }
  const requested = route === '#/dashboard' ? 'overview' : route.split('/')[2];
  const active = route === '#/history' ? 'history' : route.startsWith('#/dashboard') && data ? views.includes(requested) ? requested : 'overview' : 'upload';
  const account = isClerkEnabled ? isSignedIn ? <UserButton /> : <SignInButton mode="modal"><Button>Sign in</Button></SignInButton> : null;
  return <PortalShell activeView={active} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} actions={account} hasData={!!data}><Suspense fallback={<Skeleton label="Opening analysis…" />}>
    {active === 'upload' ? <UploadScreen onAnalyze={analyze} onUseSample={() => { setData({ ...SAMPLE_DATA, id: 'sample' }); navigate('overview'); }} isLoading={loading} progressMessage={progress} error={error} /> : active === 'history' ? <HistoryScreen onSelectAnalysis={selected => { setData(selected); navigate('overview'); }} onBack={() => navigate('upload')} /> : <ExpenseManager key={data.id || 'session'} data={persistence.analysis} persistence={persistence} view={active} onNavigate={navigate} onBack={() => navigate('upload')} />}
  </Suspense></PortalShell>;
}
