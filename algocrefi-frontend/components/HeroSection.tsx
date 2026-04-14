"use client";
import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

function useCounter(target: number, duration = 2000, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const raf = (now: number) => {
      if (!start) start = now;
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(easeOutCubic(p) * target));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

// Simulated terminal lines cycling
const TX_POOL = [
  "> deposit(1000) → shares: 997.3",
  "> borrow(500) · collateral: USDC",
  "> aura.score(0x3f2a) → 12 pts",
  "> pool.balance() → 54030 ALGO",
  "> repay(500) · interest: 1.55",
  "> withdraw(200) · shares: 199.4",
  "> aura.unlock() → 30 pts req",
  "> rate.current() → 0.31 USDC",
];

function TerminalBlock({ ready }: { ready: boolean }) {
  const [lines, setLines] = useState<string[]>([]);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    setLines(TX_POOL.slice(0, 4));
    const interval = setInterval(() => {
      setLines((prev) => [
        TX_POOL[Math.floor(Math.random() * TX_POOL.length)],
        ...prev.slice(0, 3),
      ]);
    }, 1800);
    const blinkI = setInterval(() => setBlink((b) => !b), 530);
    return () => { clearInterval(interval); clearInterval(blinkI); };
  }, []);

  return (
    <div
      style={{
        opacity: ready ? 1 : 0,
        transform: ready ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.7s ease 1.1s, transform 0.7s ease 1.1s",
        marginTop: 40,
        padding: "16px 20px",
        background: "rgba(0,255,209,0.025)",
        border: "1px solid rgba(0,255,209,0.1)",
        borderRadius: 10,
        maxWidth: 480,
      }}
    >
      <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(0,255,209,0.35)", letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FFD1", display: "inline-block", boxShadow: "0 0 6px rgba(0,255,209,0.6)" }} />
        ALGOCREFI_NODE · TESTNET · APP_ID:758675636
      </div>
      {lines.map((line, i) => (
        <div
          key={i + line}
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.8,
            color: i === 0 ? "rgba(255,255,255,0.75)" : `rgba(255,255,255,${0.2 - i * 0.03})`,
            animation: i === 0 ? "slide-up-fade 0.4s ease both" : undefined,
          }}
        >
          {line}
        </div>
      ))}
      <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(0,255,209,0.6)", marginTop: 2, lineHeight: 1.8 }}>
        &gt;{" "}
        <span style={{ opacity: blink ? 1 : 0, transition: "opacity 0.1s", background: "#00FFD1", color: "#05050A", padding: "0 2px" }}>_</span>
      </div>
    </div>
  );
}

export default function HeroSection({ onEnterApp }: { onEnterApp: () => void }) {
  const [ready, setReady] = useState(false);
  const [statsActive, setStatsActive] = useState(false);
  const [showScroll, setShowScroll] = useState(true);
  const [block, setBlock] = useState(12847392);
  const statsRef = useRef<HTMLDivElement>(null);
  const btn1Ref = useRef<HTMLButtonElement>(null);
  const btn2Ref = useRef<HTMLButtonElement>(null);

  const pool = useCounter(54030, 2000, statsActive);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Simulate live block counter
  useEffect(() => {
    const i = setInterval(() => setBlock((b) => b + 1), 3200);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsActive(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const fn = () => setShowScroll(window.scrollY < 100);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function magnetic(ref: React.RefObject<HTMLButtonElement | null>) {
    return {
      onMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
        const btn = ref.current; if (!btn) return;
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 70)
          btn.style.transform = `translate(${dx * 0.2}px,${dy * 0.2}px)`;
      },
      onMouseEnter() { const btn = ref.current; if (btn) btn.style.transition = "transform 0.1s ease, box-shadow 0.25s ease"; },
      onMouseLeave() {
        const btn = ref.current; if (!btn) return;
        btn.style.transition = "transform 0.6s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease";
        btn.style.transform = "translate(0,0)";
      },
    };
  }

  const fadeIn = (delay: number): React.CSSProperties => ({
    opacity: ready ? 1 : 0,
    transform: ready ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
  });

  const lineWrap: React.CSSProperties = { display: "block", overflow: "hidden", lineHeight: 0.88 };
  const lineIn = (delay: number): React.CSSProperties => ({
    display: "block",
    transform: ready ? "translateY(0)" : "translateY(110%)",
    transition: `transform 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section
      id="hero"
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "55fr 45fr",
        alignItems: "stretch",
        overflow: "hidden",
      }}
    >
      {/* ── LEFT COLUMN — editorial headline + terminal ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "120px 5vw 80px 6vw",
          position: "relative",
        }}
      >
        {/* Status tag — monospace, left-aligned, brutalist */}
        <div
          style={{
            ...fadeIn(0.2),
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 36,
          }}
        >
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(0,255,209,0.5)", letterSpacing: "0.1em" }}>
            &gt; TESTNET_LIVE
          </span>
          <div style={{ height: 1, width: 40, background: "rgba(0,255,209,0.3)" }} />
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>
            block #{block.toLocaleString()}
          </span>
        </div>

        {/* Main headline — left-aligned, word-per-line, massive */}
        <h1
          className="font-display"
          style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.04em" }}
        >
          <span style={lineWrap}>
            <span style={{ ...lineIn(0.4), display: "block", fontSize: "clamp(72px,9.5vw,148px)", color: "#F0F0F0" }}>
              Lend.
            </span>
          </span>
          <span style={lineWrap}>
            <span style={{ ...lineIn(0.52), display: "block", fontSize: "clamp(72px,9.5vw,148px)", color: "#F0F0F0" }}>
              Earn.
            </span>
          </span>
          {/* "On-chain." — outlined stroke text, bleeds right */}
          <span style={{ ...lineWrap, lineHeight: 0.82, marginTop: 4, overflow: "visible" }}>
            <span
              style={{
                ...lineIn(0.64),
                display: "block",
                fontSize: "clamp(72px,9.5vw,148px)",
                color: "transparent",
                WebkitTextStroke: "1.5px rgba(0,255,209,0.55)",
              }}
            >
              On-chain.
            </span>
          </span>
        </h1>

        {/* Terminal block replaces boring subtext */}
        <TerminalBlock ready={ready} />

        {/* CTA row — left-aligned */}
        <div
          style={{
            ...fadeIn(1.4),
            display: "flex",
            gap: 12,
            marginTop: 36,
            flexWrap: "wrap",
          }}
        >
          <button
            ref={btn1Ref}
            onClick={onEnterApp}
            {...magnetic(btn1Ref)}
            style={{
              background: "#00FFD1",
              color: "#05050A",
              fontFamily: "Inter,sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: "14px 32px",
              borderRadius: 9999,
              border: "none",
              cursor: "none",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 0 8px rgba(0,255,209,0.12),0 0 40px rgba(0,255,209,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.transition = "transform 0.6s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.25s ease"; }}
          >
            Enter App
          </button>
          <button
            ref={btn2Ref}
            {...magnetic(btn2Ref)}
            style={{
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              fontFamily: "Inter,sans-serif",
              fontWeight: 400,
              fontSize: 14,
              padding: "14px 32px",
              borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "none",
              transition: "background 0.25s,border-color 0.25s,color 0.25s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#F0F0F0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.transition = "transform 0.6s cubic-bezier(0.34,1.56,0.64,1),background 0.25s,border-color 0.25s,color 0.25s"; }}
          >
            Read Docs ↗
          </button>
        </div>
      </div>

      {/* ── RIGHT COLUMN — data panel ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "120px 5vw 80px 4vw",
          borderLeft: "1px solid rgba(0,255,209,0.08)",
          position: "relative",
          background: "linear-gradient(135deg, rgba(0,255,209,0.015) 0%, transparent 60%)",
        }}
      >
        {/* Orbital rings — decorative, top-right corner */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 280,
            height: 280,
            pointerEvents: "none",
            opacity: 0.6,
          }}
        >
          <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: "absolute", inset: 0, animation: "spin-cw 20s linear infinite" }}>
            <circle cx="140" cy="140" r="130" stroke="#00FFD1" strokeWidth="0.5" fill="none" />
          </svg>
          <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: "absolute", inset: 0, animation: "spin-ccw 13s linear infinite" }}>
            <circle cx="140" cy="140" r="95" stroke="#7B2FFF" strokeWidth="0.5" fill="none" />
          </svg>
          <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: "absolute", inset: 0, animation: "spin-cw 7s linear infinite" }}>
            <circle cx="140" cy="140" r="60" stroke="#00FFD1" strokeWidth="0.75" fill="none" strokeDasharray="16 6" />
          </svg>
        </div>

        {/* Panel label */}
        <div style={{ ...fadeIn(0.5), fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 32 }}>
          // PROTOCOL_METRICS
        </div>

        {/* Live stats stacked — vertical, data-terminal style */}
        <div ref={statsRef} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { label: "TOTAL_POOL_LIQUIDITY", val: pool.toLocaleString() + " ALGO", accent: "#00FFD1", delay: 0.6 },
            { label: "ALGO_PRICE", val: "0.31 USDC", accent: "#F0F0F0", delay: 0.72 },
            { label: "MIN_AURA_SCORE", val: "30 pts", accent: "#FFB347", delay: 0.84 },
            { label: "ACTIVE_LOANS", val: "2", accent: "#7B2FFF", delay: 0.96 },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                ...fadeIn(s.delay),
                padding: "20px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", marginBottom: 6 }}>
                  {s.label}
                </div>
                <div
                  className="font-display"
                  style={{ fontSize: "clamp(22px,2.8vw,34px)", fontWeight: 700, color: s.accent, lineHeight: 1, letterSpacing: "-0.02em" }}
                >
                  {s.val}
                </div>
              </div>
              {/* Micro bar accent */}
              <div style={{ width: 3, height: 32, background: s.accent, opacity: 0.35, borderRadius: 2, flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Network info — bottom of panel */}
        <div style={{ ...fadeIn(1.1), marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["NETWORK", "Algorand Testnet"],
              ["APP_ID", "758675636"],
              ["STANDARD", "ARC-4 Compliant"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>{k}</span>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "6vw",
          display: "flex",
          alignItems: "center",
          gap: 10,
          opacity: showScroll ? 0.35 : 0,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.2)", animation: "bounce-down 1.5s ease-in-out infinite" }} />
        <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>scroll</span>
      </div>

      {/* Fade to dark */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          background: "linear-gradient(to bottom, transparent, #05050A)",
          pointerEvents: "none",
        }}
      />

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          #hero { grid-template-columns: 1fr !important; }
          #hero > div:last-of-type { border-left: none !important; border-top: 1px solid rgba(0,255,209,0.08) !important; padding-top: 60px !important; }
        }
      `}</style>
    </section>
  );
}
