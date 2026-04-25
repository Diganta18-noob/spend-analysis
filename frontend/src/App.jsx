import { useState, useCallback, useEffect } from "react";
import UploadScreen from "./components/UploadScreen";
import ExpenseManager from "./components/ExpenseManager";
import AdminLogin from "./components/admin/AdminLogin";
import AdminDashboard from "./components/admin/AdminDashboard";
import { analyzeStatements } from "./services/geminiService";
import { SAMPLE_DATA } from "./data/sampleData";
import { saveAnalysis, loadAnalysis, clearAnalysis } from "./services/cacheService";
import { updateAnalysis } from "./services/apiService";

function App() {
  const [route, setRoute] = useState(window.location.hash || "#/");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleAnalyze = useCallback(async (files) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await analyzeStatements(files);
      setData(result);
      window.location.hash = "#/dashboard";
    } catch (err) {
      setError(err.message || "Failed to analyze statements. Please try again.");
    } finally {
      setIsLoading(false);
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
      />
    );
  }

  return (
    <UploadScreen
      onAnalyze={handleAnalyze}
      onUseSample={handleUseSample}
      isLoading={isLoading}
      error={error}
    />
  );
}

export default App;
