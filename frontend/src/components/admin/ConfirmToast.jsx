import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ConfirmToast({ show, message, subMessage, onConfirm, onCancel }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onCancel();
      }, 10000); // Auto dismiss after 10s
      return () => clearTimeout(timer);
    }
  }, [show, onCancel]);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "30px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(15, 15, 30, 0.95)",
      backdropFilter: "blur(12px)",
      border: "1px solid #ef4444",
      borderRadius: "12px",
      padding: "16px 20px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(239,68,68,0.15)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      minWidth: "320px",
      animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .confirm-btn {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
          border: none;
          flex: 1;
        }
        .confirm-btn-danger {
          background: #ef4444;
          color: #fff;
        }
        .confirm-btn-danger:hover {
          background: #dc2626;
        }
        .confirm-btn-secondary {
          background: #1e1e38;
          color: #e2e8f0;
          border: 1px solid #333355;
        }
        .confirm-btn-secondary:hover {
          background: #2a2a4a;
        }
      `}</style>
      
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ color: "#ef4444", marginTop: "2px" }}>
          <AlertTriangle size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#f8fafc", fontSize: "14px", fontWeight: "500", lineHeight: "1.4" }}>
            {message}
          </div>
          {subMessage && (
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
              {subMessage}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
        <button className="confirm-btn confirm-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="confirm-btn confirm-btn-danger" onClick={onConfirm}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}
