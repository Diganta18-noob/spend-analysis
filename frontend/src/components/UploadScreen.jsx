import { useState, useRef, useCallback } from "react";

export default function UploadScreen({ onAnalyze, onUseSample, isLoading, error }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((newFiles) => {
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...imageFiles]);
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

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #08080f; }
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
        .sample-link:hover {
          color: #94a3b8 !important;
        }
        .file-remove:hover {
          background: #f87171 !important;
          color: #fff !important;
        }
      `}</style>

      <div style={styles.container}>
        {/* Hero Header */}
        <div style={styles.heroSection}>
          <div 
            style={{ ...styles.iconWrap, cursor: "pointer" }}
            onClick={() => window.location.hash = "#/admin"}
          >
            <span style={{ fontSize: 40, animation: "float 3s ease-in-out infinite" }}>💸</span>
          </div>
          <h1 style={styles.title}>Expense Analyzer</h1>
          <p style={styles.subtitle}>
            Upload your bank statement screenshots and get an AI-powered spend
            analysis in seconds.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          style={{
            ...styles.dropZone,
            borderColor: isDragging ? "#fbbf24" : files.length > 0 ? "#2a2a50" : "#1c1c35",
            background: isDragging
              ? "rgba(251, 191, 36, 0.04)"
              : "linear-gradient(135deg, #0f0f1e 0%, #11111f 100%)",
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
            accept="image/*"
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
              <div style={styles.dropTitle}>
                Drop bank statement images here
              </div>
              <div style={styles.dropSub}>
                or click to browse · supports PNG, JPG, WEBP
              </div>
            </div>
          ) : (
            <div style={styles.previewGrid} onClick={(e) => e.stopPropagation()}>
              {files.map((file, i) => (
                <div key={i} style={styles.previewCard}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={styles.previewImage}
                  />
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

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button
            className="upload-cta"
            disabled={files.length === 0 || isLoading}
            onClick={() => onAnalyze(files)}
            style={{
              ...styles.ctaBtn,
              opacity: files.length === 0 || isLoading ? 0.4 : 1,
              cursor: files.length === 0 || isLoading ? "not-allowed" : "pointer",
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
            ) : (
              <>✨ Analyze Statements</>
            )}
          </button>

          <button
            className="sample-link"
            onClick={onUseSample}
            disabled={isLoading}
            style={styles.sampleBtn}
          >
            or try with sample data →
          </button>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div style={styles.loadingSection}>
            <div style={styles.shimmerBar} />
            <p style={{ fontSize: 12, color: "#475569", textAlign: "center", marginTop: 12 }}>
              Reading transactions from {files.length} image{files.length > 1 ? "s" : ""}… this may take 10–20 seconds.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div style={styles.footer}>
          <div style={styles.footerItem}>
            <span>🔒</span>
            <span>Images are sent directly to Google Gemini — nothing stored on any server</span>
          </div>
          <div style={styles.footerItem}>
            <span>⚡</span>
            <span>Powered by Gemini 2.0 Flash with vision capabilities</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    background: "#08080f",
    minHeight: "100vh",
    color: "#e2e8f0",
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
  },
  container: {
    maxWidth: 560,
    width: "100%",
  },
  heroSection: {
    textAlign: "center",
    marginBottom: 32,
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: 0,
    marginBottom: 8,
    background: "linear-gradient(135deg, #fff 0%, #94a3b8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 1.6,
    maxWidth: 400,
    margin: "0 auto",
  },
  dropZone: {
    border: "2px dashed #1c1c35",
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
    color: "#94a3b8",
    marginBottom: 6,
  },
  dropSub: {
    fontSize: 12,
    color: "#475569",
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
    border: "1px solid #1c1c35",
    background: "#0a0a18",
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
    border: "none",
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
    color: "#475569",
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
    border: "2px dashed #1c1c35",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    cursor: "pointer",
    transition: "border-color 0.2s",
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
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  ctaBtn: {
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
  },
  sampleBtn: {
    background: "none",
    border: "none",
    color: "#475569",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "color 0.15s",
  },
  loadingSection: {
    marginTop: 20,
  },
  shimmerBar: {
    height: 4,
    borderRadius: 2,
    background: "linear-gradient(90deg, #1c1c35 0%, #fbbf2440 50%, #1c1c35 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
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
    color: "#334155",
  },
};
