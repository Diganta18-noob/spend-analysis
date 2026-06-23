import { useState, useRef, useCallback, useEffect } from "react";
import { pingServer } from "../services/apiService";

export default function UploadScreen({ onAnalyze, onUseSample, isLoading, error, theme, toggleTheme, progressMessage }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfPasswords, setPdfPasswords] = useState({});
  const [serverStatus, setServerStatus] = useState("checking"); // checking, online, offline, waking
  const fileInputRef = useRef(null);

  const pingServerFast = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
    const API_BASE = import.meta.env.VITE_API_URL || "/api";
    try {
      const res = await fetch(`${API_BASE}/ping`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Server not responding");
      return true;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  // Check server status on mount
  useEffect(() => {
    const init = async () => {
      setServerStatus("checking");
      try {
        await pingServerFast();
        setServerStatus("online");
      } catch (err) {
        setServerStatus("offline");
        wakeUpBackend();
      }
    };
    init();
  }, []);

  const wakeUpBackend = async () => {
    setServerStatus("waking");
    
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds total
    
    const poll = async () => {
      try {
        await pingServerFast();
        setServerStatus("online");
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Try again in 1s
        } else {
          setServerStatus("offline");
          console.error("Failed to wake up server after multiple attempts");
        }
      }
    };
    
    poll();
  };

  const handleFiles = useCallback((newFiles) => {
    const validFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeClick = () => {
    onAnalyze(files, pdfPasswords);
  };

  // Extract filename from error message
  const extractFileName = (errMsg) => {
    const match = errMsg?.match(/"([^"]+)"/);
    return match ? match[1] : "the PDF";
  };

  const handlePasswordSubmit = () => {
    const fileName = extractFileName(error);
    if (pdfPassword && fileName) {
      const updatedPasswords = { ...pdfPasswords, [fileName]: pdfPassword };
      setPdfPasswords(updatedPasswords);
      setPdfPassword("");
      // Re-trigger analysis with the new password
      onAnalyze(files, updatedPasswords);
    }
  };

  // Detect password error from parent
  const showPasswordPrompt = error && (
    error.includes("password-protected") || 
    error.includes("PDF_PASSWORD_REQUIRED") ||
    error.includes("PDF_PASSWORD_INCORRECT") ||
    error.includes("Incorrect password")
  );

  // Detect location restriction error
  const isLocationError = error && (
    error.toLowerCase().includes("user location is not supported") ||
    error.toLowerCase().includes("location is not supported")
  );


  return (
    <div style={styles.root}>
      {/* Floating Theme Toggler */}
      {toggleTheme && (
        <button
          onClick={toggleTheme}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "var(--app-card-solid)",
            border: "1px solid var(--app-border)",
            color: "var(--app-text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            transition: "all 0.2s",
            zIndex: 1000,
            fontSize: "18px"
          }}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--app-bg); transition: background-color 0.3s ease; }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.05); }
          50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.15); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .upload-cta:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(251, 191, 36, 0.3);
        }
        .upload-cta:active:not(:disabled) {
          transform: translateY(0);
        }
        .sample-cta:hover:not(:disabled) {
          border-color: var(--app-border-hover) !important;
          background: var(--app-hover-bg) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05);
        }
        .sample-cta:active:not(:disabled) {
          transform: translateY(0);
        }
        .file-remove:hover {
          background: #f87171 !important;
          color: #fff !important;
          border-color: #f87171 !important;
        }
        .pwd-input:focus {
          border-color: #fbbf24 !important;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
        }
        .footer-link:hover {
          color: var(--app-text) !important;
        }
        .preview-box:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        }
        @media (max-width: 480px) {
          .upload-actions {
            flex-direction: column !important;
            width: 100%;
          }
          .upload-actions button {
            width: 100% !important;
          }
          .step-strip {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 16px !important;
          }
          .step-arrow {
            display: none !important;
          }
        }
        @media (max-width: 360px) {
          .drop-zone {
            padding: 16px !important;
            min-height: 140px !important;
          }
          .drop-title {
            font-size: 13px !important;
          }
          .drop-sub {
            font-size: 10px !important;
          }
          .hero-title {
            font-size: 24px !important;
          }
          .hero-subtitle {
            font-size: 12px !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        {/* Server Status Banner */}
        <div style={{
          marginBottom: 20,
          padding: "10px 16px",
          borderRadius: 12,
          background: serverStatus === "online" ? "rgba(52, 211, 153, 0.05)" : 
                     serverStatus === "waking" || serverStatus === "checking" ? "rgba(251, 191, 36, 0.05)" : 
                     "rgba(248, 113, 113, 0.05)",
          border: `1px solid ${
            serverStatus === "online" ? "rgba(52, 211, 153, 0.2)" : 
            serverStatus === "waking" || serverStatus === "checking" ? "rgba(251, 191, 36, 0.2)" : 
            "rgba(248, 113, 113, 0.2)"
          }`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: serverStatus === "online" ? "#34d399" : 
                         serverStatus === "waking" || serverStatus === "checking" ? "#fbbf24" : 
                         "#f87171",
              boxShadow: `0 0 10px ${
                serverStatus === "online" ? "#34d399" : 
                serverStatus === "waking" || serverStatus === "checking" ? "#fbbf24" : 
                "#f87171"
              }`,
              animation: serverStatus === "waking" || serverStatus === "checking" ? "pulse-glow 1s ease-in-out infinite" : "none"
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: serverStatus === "online" ? "#34d399" : "#94a3b8" }}>
              {serverStatus === "checking" ? "Checking Server..." : 
               serverStatus === "online" ? "Server Online" : 
               serverStatus === "offline" ? "Server Sleeping" : 
               "Warming up (~20s)..."}
            </span>
          </div>
          
          {serverStatus === "offline" && (
            <button 
              onClick={wakeUpBackend}
              style={{
                background: "#fbbf24",
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "#0a0a0a",
                cursor: "pointer"
              }}
            >
              Wake Up Backend ⚡
            </button>
          )}
          
          {serverStatus === "online" && (
            <span style={{ fontSize: 10, color: "#34d399", opacity: 0.8 }}>
              Ready to Analyze
            </span>
          )}
        </div>

        {/* Hero Header */}
        <div style={styles.heroSection}>
          <div 
            style={{ ...styles.iconWrap, cursor: "pointer" }}
            onClick={() => window.location.hash = "#/admin"}
          >
            <span style={{ fontSize: 40, animation: "float 3s ease-in-out infinite" }}>💸</span>
          </div>
          <h1 className="hero-title" style={styles.title}>Expense Analyzer</h1>
          <p className="hero-subtitle" style={styles.subtitle}>
            Upload your bank statement screenshots and get an AI-powered spend
            analysis in seconds.
          </p>
        </div>

        {/* 3-Step Process Strip */}
        <div className="step-strip" style={styles.stepStrip}>
          <div style={styles.stepItem}>
            <span style={styles.stepNumber}>1</span>
            <div style={styles.stepTextContainer}>
              <span style={styles.stepTitle}>Upload</span>
              <span style={styles.stepDesc}>PDFs or images</span>
            </div>
          </div>
          <div className="step-arrow" style={styles.stepArrow}>➔</div>
          <div style={styles.stepItem}>
            <span style={styles.stepNumber}>2</span>
            <div style={styles.stepTextContainer}>
              <span style={styles.stepTitle}>AI Extracts</span>
              <span style={styles.stepDesc}>Redacts & parses</span>
            </div>
          </div>
          <div className="step-arrow" style={styles.stepArrow}>➔</div>
          <div style={styles.stepItem}>
            <span style={styles.stepNumber}>3</span>
            <div style={styles.stepTextContainer}>
              <span style={styles.stepTitle}>Dashboard</span>
              <span style={styles.stepDesc}>View insights</span>
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className="drop-zone"
          style={{
            ...styles.dropZone,
            borderColor: isDragging ? "#fbbf24" : files.length > 0 ? "var(--app-border-hover)" : "var(--app-border)",
            background: isDragging
              ? "rgba(251, 191, 36, 0.04)"
              : "var(--app-card-bg)",
            animation: files.length === 0 ? "pulse-glow 3s ease-in-out infinite" : "none",
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />

          {files.length === 0 ? (
            <div style={styles.dropContent}>
              <div style={styles.uploadIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="drop-title" style={styles.dropTitle}>
                Drop bank statement files here
              </div>
              <div className="drop-sub" style={styles.dropSub}>
                or click to browse · supports PDF, PNG, JPG, WEBP
              </div>
              <div style={{ ...styles.dropSub, marginTop: 4, color: "#34d399", fontSize: 10 }}>
                🔐 Password-protected PDFs supported
              </div>
            </div>
          ) : (
            <div style={styles.previewGrid} onClick={(e) => e.stopPropagation()}>
              {files.map((file, i) => (
                <div key={i} style={styles.previewCard}>
                  {file.type === "application/pdf" ? (
                    <div style={{ ...styles.previewImage, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1c35', color: '#fbbf24', fontSize: 32 }}>
                      {pdfPasswords[file.name] ? "🔓" : "📄"}
                    </div>
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      style={styles.previewImage}
                    />
                  )}
                  <button
                    className="file-remove"
                    style={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                  >
                    ✕
                  </button>
                  <div style={styles.fileName}>
                    {file.name.length > 18
                      ? file.name.slice(0, 15) + "..."
                      : file.name}
                  </div>
                </div>
              ))}
              <div
                style={styles.addMoreCard}
                onClick={() => fileInputRef.current?.click()}
              >
                <span style={{ fontSize: 24, color: "#475569" }}>+</span>
                <span style={{ fontSize: 11, color: "#475569" }}>Add more</span>
              </div>
            </div>
          )}
        </div>

        {/* Password Prompt for Protected PDFs */}
        {showPasswordPrompt && (
          <div style={styles.passwordBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🔐</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#fbbf24" }}>
                Password Required
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>
              The file <strong style={{ color: "#e2e8f0" }}>{extractFileName(error)}</strong> is password-protected. Enter the password to decrypt it.
            </p>
            {(error.includes("Incorrect password") || error.includes("PDF_PASSWORD_INCORRECT")) && (
              <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, background: "rgba(239, 68, 68, 0.1)", padding: "8px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span>⚠️</span> Incorrect password. Please try again.
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="pwd-input"
                type="password"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder="Enter PDF password"
                style={styles.passwordInput}
              />
              <button
                onClick={handlePasswordSubmit}
                disabled={!pdfPassword}
                style={{
                  ...styles.passwordBtn,
                  opacity: pdfPassword ? 1 : 0.4,
                  cursor: pdfPassword ? "pointer" : "not-allowed",
                }}
              >
                Unlock & Retry
              </button>
            </div>
          </div>
        )}

        {/* Error (non-password) */}
        {error && !showPasswordPrompt && (
          isLocationError ? (
            <div style={{
              ...styles.errorBox,
              background: "rgba(251, 191, 36, 0.08)",
              border: "1px solid rgba(251, 191, 36, 0.25)",
              flexDirection: "column",
              gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flexShrink: 0 }}>⚠</span>
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>User location is not supported for the API use.</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, paddingLeft: 24 }}>
                The backend server is in a region restricted by Google's Gemini API. To fix this:
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  <li>Redeploy the backend to a <strong style={{ color: "#e2e8f0" }}>US region</strong> (Render → Settings → Region)</li>
                  <li>Or <strong style={{ color: "#e2e8f0" }}>enable billing</strong> on your Google AI Studio project</li>
                </ul>
              </div>
            </div>
          ) : (
            <div style={styles.errorBox}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )
        )}

        {/* Actions */}
        <div className="upload-actions" style={styles.actions}>
          <button
            className="upload-cta"
            disabled={files.length === 0 || isLoading || serverStatus !== "online"}
            onClick={handleAnalyzeClick}
            style={{
              ...styles.ctaBtn,
              opacity: files.length === 0 || isLoading || serverStatus !== "online" ? 0.4 : 1,
              cursor: files.length === 0 || isLoading || serverStatus !== "online" ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(0,0,0,0.2)",
                    borderTopColor: "#000",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                    display: "inline-block",
                  }}
                />
                Analyzing with AI…
              </span>
            ) : serverStatus !== "online" ? (
              <>⚡ Wake Server</>
            ) : (
              <>✨ Analyze Statements</>
            )}
          </button>
          
          <button
            className="sample-cta"
            onClick={onUseSample}
            disabled={isLoading}
            style={styles.sampleBtn}
          >
            Try with sample data →
          </button>
        </div>

        {serverStatus !== "online" && files.length > 0 && (
          <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 8, textAlign: "center" }}>
            Backend is currently sleeping. Click 'Wake Up' at the top to start.
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div style={styles.loadingSection}>
            <div style={styles.shimmerBar} />
            <p style={{ fontSize: 12, color: "#475569", textAlign: "center", marginTop: 12 }}>
              {progressMessage || `Reading transactions from ${files.length} file${files.length > 1 ? "s" : ""}… this may take 10–20 seconds.`}
            </p>
          </div>
        )}

        {/* Inline Dashboard Screenshot Preview */}
        <div className="preview-box" style={styles.previewBox}>
          <div style={styles.previewHeader}>
            <span style={styles.previewDot} />
            <span style={styles.previewDot} />
            <span style={styles.previewDot} />
            <span style={styles.previewTitle}>Dashboard Preview</span>
          </div>
          <img
            src="/og.png"
            alt="Dashboard Preview"
            style={styles.previewImg}
          />
        </div>

        {/* Footer info */}
        <div style={styles.footer}>
          <div style={styles.footerItem}>
            <span>🔒</span>
            <span>Your data is redacted before storage — personal details are never saved</span>
          </div>
          <div style={styles.footerItem}>
            <span>🛡️</span>
            <span>Account numbers, names & balances are scrubbed from records</span>
          </div>
          
          <div style={styles.footerSeparator} />

          <div style={styles.footerCredits}>
            <a
              href="https://github.com/Diganta18-noob/spend-analysis"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
              style={styles.footerLink}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              Open source on GitHub
            </a>
            <span style={styles.footerBrand}>
              Powered by Lovable AI / Gemini
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    background: "var(--app-bg)",
    minHeight: "100vh",
    color: "var(--app-text)",
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    transition: "background-color 0.3s ease, color 0.3s ease",
  },
  container: {
    maxWidth: 560,
    width: "100%",
  },
  heroSection: {
    textAlign: "center",
    marginBottom: 24,
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: 0,
    marginBottom: 8,
    lineHeight: "1.3",
    paddingBottom: "6px",
    background: "linear-gradient(135deg, var(--app-text-h) 0%, var(--app-text-darker) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: 14,
    color: "var(--app-text-muted)",
    lineHeight: 1.6,
    maxWidth: 400,
    margin: "0 auto",
  },
  stepStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255, 255, 255, 0.01)",
    backdropFilter: "blur(8px)",
    border: "1px solid var(--app-border)",
    borderRadius: 16,
    padding: "12px 16px",
    marginBottom: 24,
    gap: 8,
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid #fbbf24",
    color: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepTextContainer: {
    display: "flex",
    flexDirection: "column",
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--app-text-h)",
  },
  stepDesc: {
    fontSize: 9,
    color: "var(--app-text-muted)",
  },
  stepArrow: {
    color: "var(--app-text-darker)",
    fontSize: 12,
  },
  dropZone: {
    border: "2px dashed var(--app-border)",
    borderRadius: 16,
    padding: 32,
    cursor: "pointer",
    transition: "all 0.3s ease",
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropContent: {
    textAlign: "center",
  },
  uploadIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--app-text-muted)",
    marginBottom: 6,
  },
  dropSub: {
    fontSize: 12,
    color: "var(--app-text-darker)",
  },
  previewGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  previewCard: {
    position: "relative",
    width: 100,
    height: 130,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid var(--app-border)",
    background: "var(--app-input-bg)",
  },
  previewImage: {
    width: "100%",
    height: 96,
    objectFit: "cover",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(0,0,0,0.6)",
    color: "#94a3b8",
    fontSize: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  },
  fileName: {
    fontSize: 9,
    color: "var(--app-text-muted)",
    padding: "4px 6px",
    textAlign: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  addMoreCard: {
    width: 100,
    height: 130,
    borderRadius: 10,
    border: "2px dashed var(--app-border)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  passwordBox: {
    marginTop: 16,
    padding: "16px 20px",
    borderRadius: 12,
    background: "rgba(251, 191, 36, 0.05)",
    border: "1px solid rgba(251, 191, 36, 0.2)",
  },
  passwordInput: {
    flex: 1,
    padding: "10px 14px",
    background: "var(--app-input-bg)",
    border: "1px solid var(--app-border)",
    borderRadius: 8,
    color: "var(--app-text)",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  passwordBtn: {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    border: "none",
    borderRadius: 8,
    color: "#0a0a0a",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  errorBox: {
    marginTop: 16,
    padding: "12px 16px",
    borderRadius: 10,
    background: "rgba(248, 113, 113, 0.08)",
    border: "1px solid rgba(248, 113, 113, 0.2)",
    color: "#fca5a5",
    fontSize: 13,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    lineHeight: 1.5,
  },
  actions: {
    marginTop: 24,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  ctaBtn: {
    flex: 1,
    width: "100%",
    padding: "14px 24px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    color: "#0a0a0a",
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sampleBtn: {
    flex: 1,
    width: "100%",
    padding: "14px 24px",
    borderRadius: 12,
    border: "1px solid var(--app-border)",
    background: "var(--app-card-solid)",
    color: "var(--app-text)",
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  loadingSection: {
    marginTop: 20,
  },
  shimmerBar: {
    height: 4,
    borderRadius: 2,
    background: "var(--app-shimmer-bg)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
  },
  previewBox: {
    marginTop: 32,
    borderRadius: 12,
    border: "1px solid var(--app-border)",
    background: "var(--app-card-solid)",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    cursor: "pointer",
  },
  previewHeader: {
    background: "rgba(255, 255, 255, 0.02)",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderBottom: "1px solid var(--app-border)",
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--app-text-darker)",
  },
  previewTitle: {
    fontSize: 10,
    color: "var(--app-text-muted)",
    marginLeft: 6,
    fontWeight: 500,
  },
  previewImg: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  footer: {
    marginTop: 40,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  footerItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    color: "var(--app-text-darker)",
  },
  footerSeparator: {
    height: 1,
    background: "var(--app-border)",
    margin: "12px 0 8px 0",
  },
  footerCredits: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  footerLink: {
    color: "var(--app-text-muted)",
    textDecoration: "none",
    fontSize: 11,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    transition: "color 0.2s",
  },
  footerBrand: {
    fontSize: 11,
    color: "var(--app-text-darker)",
    fontWeight: 500,
  },
};
