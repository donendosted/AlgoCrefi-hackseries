"use client";
import { useEffect, useState } from "react";
import { useToast, type Toast } from "./toastContext";

const BORDER: Record<string, string> = {
  success: "#00FFD1",
  error: "#FF4444",
  warning: "#FFB347",
  info: "rgba(255,255,255,0.3)",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Shrink progress bar
    const start = performance.now();
    const dur = 4000;
    const raf = (now: number) => {
      const elapsed = now - start;
      setProgress(Math.max(0, 100 - (elapsed / dur) * 100));
      if (elapsed < dur) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        background: "rgba(8,8,18,0.96)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderLeft: `3px solid ${BORDER[toast.type] ?? BORDER.info}`,
        borderRadius: 12,
        padding: "14px 18px",
        minWidth: 280,
        maxWidth: 340,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        transform: visible ? "translateX(0)" : "translateX(110%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#F0F0F0" }}>
            {toast.title}
          </div>
          {toast.message && (
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
              {toast.message}
            </div>
          )}
          {toast.txId && (
            (() => {
              const shortTx = `${toast.txId.slice(0, 8)}...${toast.txId.slice(-6)}`;
              return (
            <a
              href={`https://testnet.explorer.perawallet.app/tx/${toast.txId}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 6,
                fontFamily: "Inter,sans-serif",
                fontSize: 12,
                color: "#00FFD1",
                textDecoration: "none",
              }}
            >
              View {shortTx} ↗
            </a>
              );
            })()
          )}
        </div>
        <button
          onClick={onRemove}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1, flexShrink: 0 }}
        >
          ✕
        </button>
      </div>
      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          width: `${progress}%`,
          background: BORDER[toast.type] ?? BORDER.info,
          transition: "none",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "all" }}>
          <ToastItem toast={t} onRemove={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
