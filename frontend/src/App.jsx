import { useState, useCallback, useEffect } from "react";
import UploadScreen from "./components/UploadScreen";
import ExpenseManager from "./components/ExpenseManager";
import AdminLogin from "./components/admin/AdminLogin";
import AdminDashboard from "./components/admin/AdminDashboard";
import { analyzeStatementsV2 } from "./services/geminiService";
import { SAMPLE_DATA } from "./data/sampleData";
import { saveAnalysis, loadAnalysis, clearAnalysis } from "./services/cacheService";
import { updateAnalysis } from "./services/apiService";

function App() {
  const [route, setRoute] = useState(window.location.hash || "#/");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  // Sync theme with document class and localStorage
  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light-mode");
    } else {
      document.documentElement.classList.remove("light-mode");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }, []);

  // Handle hash changes for simple routing
  useEffect(() => {
    const onHashChange = () => {
      const newRoute = window.location.hash || "#/";
      setRoute(newRoute);
      
      // Auto-logout admin if they navigate away from admin pages (like hitting back button)
      if (!newRoute.startsWith("#/admin")) {
        sessionStorage.removeItem("admin_token");
      }
    };
    
    // Also clear it initially if they land on a non-admin page
    if (!(window.location.hash || "#/").startsWith("#/admin")) {
      sessionStorage.removeItem("admin_token");
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Load cached analysis on mount
  useEffect(() => {
    const cached = loadAnalysis();
    if (cached && (route === "#/" || route === "#/dashboard")) {
      setData(cached);
      window.location.hash = "#/dashboard";
    }
  }, []);

  // Sync state to cache and backend whenever data changes
  useEffect(() => {
    if (data) {
      saveAnalysis(data);
      if (data.id && data.id !== "sample") {
        updateAnalysis(data.id, data).catch(err => console.error("Failed to sync analysis to server:", err));
      }
    }
  }, [data]);

  const handleAnalyze = useCallback(async (files, pdfPasswords = {}) => {
    setError(null);
    setIsLoading(true);
    setProgressMessage("Starting analysis...");
    try {
      const result = await analyzeStatementsV2(files, pdfPasswords, ({ event, data }) => {
        if (event === "page_converted") {
          setProgressMessage(`Converting ${data.file || "PDF"}: page ${data.page} of ${data.total}...`);
        } else if (event === "page_extracted") {
          setProgressMessage(`Extracting transactions: page ${data.index} of ${data.total} (${data.transactionsCount} found)...`);
        } else if (event === "finalizing") {
          setProgressMessage(data.message || "Redacting PII and generating insights...");
        }
      });
      setData(result);
      window.location.hash = "#/dashboard";
    } catch (err) {
      setError(err.message || "Failed to analyze statements. Please try again.");
    } finally {
      setIsLoading(false);
      setProgressMessage("");
    }
  }, []);

  const handleUseSample = useCallback(() => {
    setData({ id: "sample", ...SAMPLE_DATA });
    window.location.hash = "#/dashboard";
  }, []);

  const handleBack = useCallback(() => {
    clearAnalysis();
    setData(null);
    setError(null);
    window.location.hash = "#/";
  }, []);

  const handleUpdateTransaction = useCallback((txnIndex, field, value) => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.transactions = [...prev.transactions];
      updated.transactions[txnIndex] = { ...updated.transactions[txnIndex], [field]: value };
      return updated;
    });
  }, []);

  const handleBatchUpdateCategory = useCallback((desc, newCat) => {
    setData(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.transactions = prev.transactions.map(t => 
        t.desc === desc ? { ...t, cat: newCat } : t
      );
      return updated;
    });
  }, []);

  // ROUTING
  if (route.startsWith("#/admin")) {
    const hasToken = !!sessionStorage.getItem("admin_token");
    
    // Not logged in -> force to login page
    if (!hasToken && route !== "#/admin/login") {
      window.location.hash = "#/admin/login";
      return null;
    }
    
    // Already logged in but trying to access login page -> force to dashboard
    if (hasToken && route === "#/admin/login") {
      window.location.hash = "#/admin/dashboard";
      return null;
    }
    
    if (route === "#/admin/login") {
      return <AdminLogin />;
    }
    
    return <AdminDashboard />;
  }

  if (route === "#/dashboard" && data) {
    return (
      <ExpenseManager 
        data={data} 
        onBack={handleBack} 
        onUpdateTransaction={handleUpdateTransaction} 
        onBatchUpdateCategory={handleBatchUpdateCategory}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <UploadScreen
      onAnalyze={handleAnalyze}
      onUseSample={handleUseSample}
      isLoading={isLoading}
      progressMessage={progressMessage}
      error={error}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  );
}

export default App;
