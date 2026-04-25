import React, { useEffect } from "react";
import { Check, X, Layers } from "lucide-react";

export default function Toast({ show, txnDesc, newCat, onApplyOne, onApplyAll, onDismiss }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 8000); // Auto dismiss after 8s
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "30px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(15, 15, 30, 0.95)",
      backdropFilter: "blur(12px)",
      border: "1px solid #fbbf24",
      borderRadius: "12px",
      padding: "16px 20px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(251,191,36,0.1)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      minWidth: "340px",
      animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .toast-btn {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          border: none;
        }
        .toast-btn-primary {
          background: #fbbf24;
          color: #000;
        }
        .toast-btn-primary:hover {
          background: #f59e0b;
        }
        .toast-btn-secondary {
          background: #1e1e38;
          color: #e2e8f0;
          border: 1px solid #333355;
        }
        .toast-btn-secondary:hover {
          background: #2a2a4a;
        }
      `}</style>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: "1.4" }}>
          Update category to <strong style={{ color: "#fbbf24" }}>{newCat}</strong>?
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
            For <span style={{ fontFamily: "DM Mono, monospace", color: "#cbd5e1" }}>"{txnDesc}"</span>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
        <button className="toast-btn toast-btn-secondary" onClick={onApplyOne}>
          <Check size={14} /> Just this one
        </button>
        <button className="toast-btn toast-btn-primary" onClick={onApplyAll} style={{ flex: 1, justifyContent: "center" }}>
          <Layers size={14} /> Update all matching
        </button>
      </div>
    </div>
  );
}
