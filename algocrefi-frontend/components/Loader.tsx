"use client";
import { useEffect, useRef } from "react";

interface LoaderProps {
  onDone: () => void;
}

export default function Loader({ onDone }: LoaderProps) {
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = loaderRef.current;
      if (el) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      }
      document.body.classList.remove("loading");
      setTimeout(onDone, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      ref={loaderRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "#05050A",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        transition: "opacity 0.5s ease",
      }}
    >
      {/* Mini orbital rings */}
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg
          width="160" height="160" viewBox="0 0 160 160"
          style={{ position: "absolute", inset: 0, animation: "spin-cw 20s linear infinite" }}
        >
          <circle cx="80" cy="80" r="72" stroke="#00FFD1" strokeWidth="0.75" fill="none" opacity="0.15" />
        </svg>
        <svg
          width="160" height="160" viewBox="0 0 160 160"
          style={{ position: "absolute", inset: 0, animation: "spin-ccw 14s linear infinite" }}
        >
          <circle cx="80" cy="80" r="54" stroke="#7B2FFF" strokeWidth="0.75" fill="none" opacity="0.2" />
        </svg>
        <svg
          width="160" height="160" viewBox="0 0 160 160"
          style={{ position: "absolute", inset: 0, animation: "spin-cw 8s linear infinite" }}
        >
          <circle cx="80" cy="80" r="36" stroke="#00FFD1" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="20 8" />
        </svg>
        <svg
          width="48" height="48" viewBox="0 0 48 48"
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            animation: "pulse-hex 3s ease-in-out infinite",
          }}
        >
          <polygon
            points="24,4 42,14 42,34 24,44 6,34 6,14"
            stroke="#00FFD1" strokeWidth="1.5"
            fill="rgba(0,255,209,0.05)"
          />
        </svg>
      </div>

      {/* Wordmark with shimmer */}
      <div className="font-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
        <span style={{ color: "#F0F0F0" }}>Algo</span>
        <span
          style={{
            background: "linear-gradient(90deg,#F0F0F0 0%,#00FFD1 50%,#F0F0F0 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer-sweep 1.5s linear infinite",
          }}
        >
          Crefi
        </span>
      </div>
    </div>
  );
}
