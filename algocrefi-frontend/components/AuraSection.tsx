"use client";
import { useEffect, useRef, useState } from "react";

export default function AuraSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [arcDash, setArcDash] = useState(0);

  const R = 110;
  const CIRC = 2 * Math.PI * R;
  const TARGET_DASH = CIRC * (1 / 30);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Animate arc on visible
  useEffect(() => {
    if (!visible) return;
    let start: number | null = null;
    const raf = (now: number) => {
      if (!start) start = now;
      const p = Math.min((now - start) / 1800, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setArcDash(ease * TARGET_DASH);
      if (p < 1) requestAnimationFrame(raf);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [visible, TARGET_DASH]);

  const fadeIn = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  const slideIn = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateX(0)" : "translateX(24px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section
      id="aura"
      ref={sectionRef}
      style={{
        position: "relative",
        zIndex: 1,
        padding: "120px 6vw",
        background: "#06060D",
        borderTop: "1px solid rgba(255,183,71,0.08)",
        borderBottom: "1px solid rgba(255,183,71,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Massive background "30" texture — editorial typography as decoration */}
      <div
        aria-hidden="true"
        className="font-display"
        style={{
          position: "absolute",
          right: "-2vw",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "clamp(280px,35vw,520px)",
          fontWeight: 800,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: "1px rgba(255,183,71,0.06)",
          letterSpacing: "-0.06em",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        30
      </div>

      {/* Debug annotation */}
      <div
        style={{
          ...fadeIn(0),
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 64,
        }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,183,71,0.35)", letterSpacing: "0.05em" }}>
          // SECTION_04
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,183,71,0.08)" }} />
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.15)", letterSpacing: "0.05em" }}>
          aura.getScore(wallet)
        </span>
      </div>

      {/* Main two-column layout */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8vw",
          alignItems: "center",
        }}
      >
        {/* Left column */}
        <div>
          <div style={{ ...fadeIn(0.05), fontFamily: "Inter,sans-serif", fontSize: 11, color: "#FFB347", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 20 }}>
            AURA CREDIT
          </div>
          <h2
            className="font-display"
            style={{
              ...fadeIn(0.12),
              fontSize: "clamp(36px,5vw,60px)",
              fontWeight: 800,
              color: "#F0F0F0",
              letterSpacing: "-0.035em",
              lineHeight: 1.0,
              marginBottom: 24,
            }}
          >
            Your on-chain<br />
            <span style={{ color: "#FFB347" }}>credit score.</span><br />
            <span style={{ color: "rgba(255,255,255,0.25)", WebkitTextStroke: "1px rgba(255,255,255,0.2)", fontSize: "0.8em" }}>Trustless.</span>
          </h2>
          <p style={{ ...fadeIn(0.2), fontFamily: "Inter,sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 36, maxWidth: 400 }}>
            Every loan you repay earns Aura points. Accumulate 30 pts to unlock unsecured borrowing — no collateral, no bank.
          </p>

          {/* Bullet list — terminal style */}
          <div style={fadeIn(0.28)}>
            {[
              { code: "> check_kyc()", result: "false — not required", col: "#00FFD1" },
              { code: "> build_history()", result: "repay loans → earn pts", col: "#7B2FFF" },
              { code: "> unlock_borrow()", result: "score >= 30 pts", col: "#FFB347" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 12,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderLeft: `2px solid ${item.col}`,
                  borderRadius: 6,
                  fontFamily: "monospace",
                }}
              >
                <span style={{ fontSize: 12, color: item.col }}>{item.code}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>//</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", flex: 1 }}>{item.result}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — SVG arc score display */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, ...slideIn(0.15) }}>
          {/* Score arc */}
          <div style={{ position: "relative", width: 280, height: 280 }}>
            <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}>
              {/* Tick marks */}
              {Array.from({ length: 30 }).map((_, i) => {
                const angle = (i / 30) * 2 * Math.PI;
                const x1 = 140 + (R - 14) * Math.cos(angle);
                const y1 = 140 + (R - 14) * Math.sin(angle);
                const x2 = 140 + (R - 8) * Math.cos(angle);
                const y2 = 140 + (R - 8) * Math.sin(angle);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,183,71,0.15)" strokeWidth="1.5" />;
              })}
              {/* Track */}
              <circle cx="140" cy="140" r={R} stroke="rgba(255,183,71,0.08)" strokeWidth="7" fill="none" />
              {/* Fill */}
              <circle
                cx="140" cy="140" r={R}
                stroke="#FFB347"
                strokeWidth="7"
                fill="none"
                strokeDasharray={`${arcDash} ${CIRC}`}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 8px rgba(255,183,71,0.5))" }}
              />
            </svg>

            {/* Center content */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,183,71,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>AURA SCORE</span>
              <span className="font-display" style={{ fontSize: 48, fontWeight: 800, color: "#FFB347", lineHeight: 1, letterSpacing: "-0.04em" }}>1</span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,183,71,0.4)" }}>/ 30 pts needed</span>
            </div>
          </div>

          {/* Terminal readout box */}
          <div
            style={{
              width: "100%",
              maxWidth: 300,
              background: "rgba(255,183,71,0.03)",
              border: "1px solid rgba(255,183,71,0.12)",
              borderRadius: 10,
              padding: "16px 20px",
              fontFamily: "monospace",
            }}
          >
            <div style={{ fontSize: 10, color: "rgba(255,183,71,0.4)", marginBottom: 12, letterSpacing: "0.1em" }}>
              SCORE_READOUT · TESTNET
            </div>
            {[
              ["earned", "1 pts"],
              ["penalty", "0 pts"],
              ["net_score", "1 pts"],
              ["status", "building..."],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,183,71,0.06)" }}>
                <span style={{ fontSize: 12, color: "rgba(255,183,71,0.4)" }}>{k}</span>
                <span style={{ fontSize: 12, color: k === "status" ? "#FFB347" : "#F0F0F0" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile override */}
      <style>{`
        @media (max-width: 768px) {
          #aura > div:last-of-type { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
