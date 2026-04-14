"use client";
import { useEffect, useRef, useState } from "react";
import type { PoolInfo, UserInfo } from "@/lib/mockData";
import { estimateAlgoFromShares } from "@/src/utils/poolService";
import { formatDueDate, isLoanOverdue } from "@/src/utils/loanService";

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

function useCounter(target: number, duration = 1500, key = 0) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startVal = val;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(startVal + (target - startVal) * easeOut(p));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, key]);
  return val;
}

interface Props {
  pool: PoolInfo;
  user: UserInfo;
  lending: {
    activeLoan: number;
    dueTs: number;
    netAuraPoints: number;
    unsecuredEligible: boolean;
    blacklisted: number;
  };
  loading?: boolean;
  errors?: {
    pool?: string;
    user?: string;
    lending?: string;
  };
}

function Card({
  children,
  overdue,
  delay,
}: {
  children: React.ReactNode;
  overdue?: boolean;
  delay: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [hov, setHov] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${overdue ? "rgba(255,68,68,0.35)" : hov ? "rgba(0,255,209,0.2)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16,
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.5s ease, transform 0.5s ease, border-color 0.25s ease, box-shadow 0.25s ease${overdue ? ", border-color 2s ease infinite alternate" : ""}`,
        boxShadow: hov ? "0 8px 30px rgba(0,0,0,0.3)" : "none",
        cursor: "default",
      }}
    >
      {/* Shimmer sweep on hover */}
      {hov && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(105deg,transparent 40%,rgba(0,255,209,0.04) 50%,transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "card-shimmer 0.7s ease forwards",
            pointerEvents: "none",
            borderRadius: 16,
          }}
        />
      )}
      {children}
    </div>
  );
}

function MiniSparkline({ color = "#00FFD1" }: { color?: string }) {
  const pts = [0, 15, 8, 22, 18, 30, 25, 35].map((y, i) => `${i * 11},${35 - y}`).join(" ");
  return (
    <svg width="80" height="36" viewBox="0 0 80 36" style={{ marginTop: 8 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

function AuraArc({ pts, max = 100 }: { pts: number; max?: number }) {
  const r = 18, cx = 22, cy = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pts, max) / max);
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,183,71,0.1)" strokeWidth="4" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FFB347" strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

export default function StatCards({ pool, user, lending, loading = false, errors }: Props) {
  const poolAlgo = pool.balance / 1_000_000;
  const overdue = isLoanOverdue(lending.dueTs);
  const refreshKey = `${pool.balance}-${user.shares}-${lending.netAuraPoints}-${lending.activeLoan}-${lending.dueTs}`;
  const poolCount = useCounter(poolAlgo, 1000, loading ? 0 : refreshKey.length + pool.balance);
  const sharesCount = useCounter(user.shares, 1000, loading ? 0 : refreshKey.length + user.shares);
  const auraCount = useCounter(lending.netAuraPoints, 900, loading ? 0 : refreshKey.length + lending.netAuraPoints);
  const unsecuredEligible = lending.unsecuredEligible;
  const shareAlgoEstimate = estimateAlgoFromShares(user.shares, {
    balance: pool.balance,
    totalShares: pool.totalShares,
    sharePrice: pool.sharePrice,
  });
  const activeLoanAlgo = (lending.activeLoan / 1_000_000).toFixed(4);
  const dueDate = lending.dueTs > 0 ? formatDueDate(lending.dueTs) : null;

  const [barW, setBarW] = useState(0);
  const [auraBarW, setAuraBarW] = useState(0);
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      setBarW(pool.utilizationPct);
      setAuraBarW(Math.min((lending.netAuraPoints / 100) * 100, 100));
    }, 600);
    return () => clearTimeout(t);
  }, [loading, pool.utilizationPct, lending.netAuraPoints]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.9fr 0.9fr", gap: 14 }}>

      {/* Card 1 — Pool Balance */}
      <Card delay={0}>
        {/* Background watermark */}
        <div
          aria-hidden
          className="font-display"
          style={{
            position: "absolute",
            bottom: -12,
            right: -8,
            fontSize: 96,
            fontWeight: 800,
            color: "transparent",
            WebkitTextStroke: "1px rgba(0,255,209,0.06)",
            pointerEvents: "none",
            userSelect: "none",
            lineHeight: 1,
            letterSpacing: "-0.05em",
          }}
        >
          54K
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
            POOL_BALANCE
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity: 0.2 }}>
            <polygon points="9,1 16,5 16,13 9,17 2,13 2,5" stroke="#00FFD1" strokeWidth="1.3" />
          </svg>
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "#F0F0F0", marginTop: 10, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {loading ? (
            <span style={{ display: "inline-block", width: 170, height: 30, background: "rgba(255,255,255,0.08)", borderRadius: 6, animation: "shimmer 1.2s linear infinite" }} />
          ) : (
            <>
              {poolCount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
              <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>ALGO</span>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
          <span style={{ color: "#00FFD1", fontSize: 11 }}>↑</span>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#00FFD1" }}>+12.3 ALGO today</span>
        </div>
        {/* Utilization bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>UTILIZATION</span>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(0,255,209,0.6)" }}>{pool.utilizationPct}%</span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${barW}%`, background: "linear-gradient(90deg,#00FFD1,#7B2FFF)", borderRadius: 9999, transition: "width 1.2s ease" }} />
          </div>
        </div>
        {errors?.pool && (
          <div style={{ marginTop: 10, fontFamily: "Inter,sans-serif", fontSize: 11, color: "#FF7777" }}>
            {errors.pool}
          </div>
        )}
      </Card>

      {/* Card 2 — Your Shares */}
      <Card delay={80}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
            YOUR_SHARES
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ opacity: 0.2 }}>
            <rect x="2" y="11" width="3" height="6" rx="1" stroke="#7B2FFF" strokeWidth="1.3" />
            <rect x="7" y="7" width="3" height="10" rx="1" stroke="#7B2FFF" strokeWidth="1.3" />
            <rect x="12" y="3" width="3" height="14" rx="1" stroke="#7B2FFF" strokeWidth="1.3" />
          </svg>
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "#F0F0F0", marginTop: 10, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {loading ? (
            <span style={{ display: "inline-block", width: 140, height: 30, background: "rgba(255,255,255,0.08)", borderRadius: 6, animation: "shimmer 1.2s linear infinite" }} />
          ) : (
            <>
              {Math.floor(sharesCount).toLocaleString()}
              <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>shares</span>
            </>
          )}
        </div>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
          {loading ? "Loading..." : `≈ ${shareAlgoEstimate.toFixed(4)} ALGO`}
        </div>
        <MiniSparkline color="#7B2FFF" />
        {errors?.user && (
          <div style={{ marginTop: 10, fontFamily: "Inter,sans-serif", fontSize: 11, color: "#FF7777" }}>
            {errors.user}
          </div>
        )}
      </Card>

      {/* Card 3 — AURA Score */}
      <Card delay={160}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "#FFB347", letterSpacing: "0.12em", opacity: 0.7 }}>
            AURA_SCORE
          </span>
          <AuraArc pts={lending.netAuraPoints} />
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "#FFB347", marginTop: 6, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {loading ? <span style={{ display: "inline-block", width: 80, height: 30, background: "rgba(255,255,255,0.08)", borderRadius: 6, animation: "shimmer 1.2s linear infinite" }} /> : Math.floor(auraCount)}
          <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,183,71,0.5)", marginLeft: 4 }}>pts</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
          {unsecuredEligible ? (
            <>
              <span style={{ color: "#00FFD1" }}>✓</span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#00FFD1" }}>Unsecured eligible</span>
            </>
          ) : (
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Need 30 pts
            </span>
          )}
        </div>
        <div style={{ marginTop: 12, height: 3, background: "rgba(255,183,71,0.1)", borderRadius: 9999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${auraBarW}%`, background: "#FFB347", borderRadius: 9999, transition: "width 1.2s ease" }} />
        </div>
      </Card>

      {/* Card 4 — Active Loan */}
      <Card delay={240} overdue={overdue}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>
            ACTIVE_LOAN
          </span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            style={{ opacity: 0.25 }}>
            <circle cx="9" cy="9" r="7" stroke={overdue ? "#FF4444" : lending.activeLoan > 0 ? "#FFB347" : "rgba(255,255,255,0.4)"} strokeWidth="1.3" />
            <path d="M9 5v4.5l2.5 2.5" stroke={overdue ? "#FF4444" : lending.activeLoan > 0 ? "#FFB347" : "rgba(255,255,255,0.4)"} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
        {loading ? (
          <div style={{ marginTop: 10 }}>
            <span style={{ display: "inline-block", width: 150, height: 30, background: "rgba(255,255,255,0.08)", borderRadius: 6, animation: "shimmer 1.2s linear infinite" }} />
          </div>
        ) : lending.activeLoan > 0 ? (
          <>
            <div className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "#F0F0F0", marginTop: 10, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {activeLoanAlgo}
              <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>ALGO</span>
            </div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: overdue ? "#FF4444" : "#FFB347", marginTop: 6 }}>
              {overdue ? "OVERDUE · " : "Due "}{dueDate}
            </div>
          </>
        ) : (
          <>
            <div className="font-display" style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.2)", marginTop: 10, letterSpacing: "-0.03em" }}>
              None
            </div>
            <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>
              No active loans
            </div>
            <div style={{ marginTop: 14, padding: "8px 10px", background: "rgba(0,255,209,0.03)", border: "1px solid rgba(0,255,209,0.08)", borderRadius: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(0,255,209,0.35)", letterSpacing: "0.08em" }}>
                COLLATERAL OR AURA REQUIRED
              </span>
            </div>
          </>
        )}
        {errors?.lending && (
          <div style={{ marginTop: 10, fontFamily: "Inter,sans-serif", fontSize: 11, color: "#FF7777" }}>
            {errors.lending}
          </div>
        )}
      </Card>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.35; }
          50% { opacity: 0.8; }
          100% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
