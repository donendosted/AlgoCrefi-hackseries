"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPoolSnapshot } from "@/src/utils/marketService";
import { getPoolInfo } from "@/src/utils/poolService";
import { getLoanInfoPublic } from "@/src/utils/loanService";
import PoolValueChart from "@/components/dashboard/PoolValueChart";

function formatAlgo(value: number | null) {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })} ALGO`;
}

function formatPrice(value: number | null) {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return `${Number(value).toFixed(4)} USD`;
}

function formatSharePrice(value: number | null) {
  if (!Number.isFinite(value ?? NaN)) return "--";
  const numeric = Number(value);
  if (numeric < 0.001) return `${numeric.toFixed(6)} ALGO`;
  if (numeric < 1) return `${numeric.toFixed(4)} ALGO`;
  return `${numeric.toLocaleString("en-US", { maximumFractionDigits: 6 })} ALGO`;
}

async function fetchAlgoPriceFallback() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd"
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { algorand?: { usd?: number } };
    const usd = Number(data?.algorand?.usd ?? NaN);
    return Number.isFinite(usd) && usd > 0 ? usd : null;
  } catch {
    return null;
  }
}

async function fetchLatestRoundFallback() {
  try {
    const res = await fetch("https://testnet-api.algonode.cloud/v2/status");
    if (!res.ok) return null;
    const data = (await res.json()) as { ["last-round"]?: number; lastRound?: number };
    const round = Number(data?.["last-round"] ?? data?.lastRound ?? NaN);
    return Number.isFinite(round) && round > 0 ? Math.floor(round) : null;
  } catch {
    return null;
  }
}

function TerminalBlock({
  ready,
  appId,
  poolAlgo,
  sharePriceAlgo,
  algoUsdc,
  round,
}: {
  ready: boolean;
  appId: string;
  poolAlgo: number | null;
  sharePriceAlgo: number | null;
  algoUsdc: number | null;
  round: number | null;
}) {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const blinkI = setInterval(() => setBlink((b) => !b), 530);
    return () => {
      clearInterval(blinkI);
    };
  }, []);

  const lines = useMemo(
    () => [
      `> pool.balance() => ${formatAlgo(poolAlgo)}`,
      `> pool.share_price() => ${formatSharePrice(sharePriceAlgo)}`,
      `> price.algo_usd() => ${formatPrice(algoUsdc)}`,
      `> pool.round() => ${round == null ? "--" : round.toLocaleString("en-US")}`,
      "> source() => protocol + market feeds",
    ],
    [poolAlgo, sharePriceAlgo, algoUsdc, round]
  );

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
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          color: "rgba(0,255,209,0.35)",
          letterSpacing: "0.1em",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#00FFD1",
            display: "inline-block",
            boxShadow: "0 0 6px rgba(0,255,209,0.6)",
          }}
        />
        ALGOCREFI_NODE · TESTNET · APP_ID:{appId}
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
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          color: "rgba(0,255,209,0.6)",
          marginTop: 2,
          lineHeight: 1.8,
        }}
      >
        &gt;{" "}
        <span
          style={{
            opacity: blink ? 1 : 0,
            transition: "opacity 0.1s",
            background: "#00FFD1",
            color: "#05050A",
            padding: "0 2px",
          }}
        >
          _
        </span>
      </div>
    </div>
  );
}

export default function HeroSection({ onEnterApp }: { onEnterApp: () => void }) {
  const [ready, setReady] = useState(false);
  const [showScroll, setShowScroll] = useState(true);
  const [latestRound, setLatestRound] = useState<number | null>(null);
  const [poolAlgo, setPoolAlgo] = useState<number | null>(null);
  const [sharePriceAlgo, setSharePriceAlgo] = useState<number | null>(null);
  const [algoUsdc, setAlgoUsdc] = useState<number | null>(null);
  const [activeLoans, setActiveLoans] = useState<number | null>(null);
  const [minAuraPoints, setMinAuraPoints] = useState<number | null>(null);
  const [appId, setAppId] = useState<string>(
    String(process.env.NEXT_PUBLIC_POOL_APP_ID || process.env.NEXT_PUBLIC_APP_ID || "758675636")
  );

  const btn1Ref = useRef<HTMLButtonElement>(null);
  const btn2Ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [poolRes, snapshotRes, loanInfoRes, algoPriceRes] = await Promise.allSettled([
        getPoolInfo(),
        fetchPoolSnapshot(),
        getLoanInfoPublic(),
        fetchAlgoPriceFallback(),
      ]);
      if (!mounted) return;

      if (poolRes.status === "fulfilled") {
        const poolBalanceMicro = Number(poolRes.value?.pool?.balance ?? NaN);
        setPoolAlgo(Number.isFinite(poolBalanceMicro) ? poolBalanceMicro / 1_000_000 : null);
        const sharePriceMicro = Number(poolRes.value?.pool?.sharePrice ?? NaN);
        setSharePriceAlgo(Number.isFinite(sharePriceMicro) ? sharePriceMicro / 1_000_000 : null);

        const fromConfig = poolRes.value?.config?.appId;
        if (Number.isFinite(Number(fromConfig))) {
          setAppId(String(Number(fromConfig)));
        }
      }

      const algoPriceUsd = Number(
        algoPriceRes.status === "fulfilled" ? algoPriceRes.value : NaN
      );
      const hasAlgoPriceUsd = Number.isFinite(algoPriceUsd) && algoPriceUsd > 0;
      if (hasAlgoPriceUsd) {
        setAlgoUsdc(algoPriceUsd);
      }

      if (snapshotRes.status === "fulfilled") {
        const snapshotPrice = Number(snapshotRes.value?.usdcPerAlgo ?? NaN);
        const nextPrice = Number.isFinite(snapshotPrice) && snapshotPrice > 0 ? snapshotPrice : null;
        if (!hasAlgoPriceUsd) {
          setAlgoUsdc(nextPrice);
        }

        const round = Number(snapshotRes.value?.round ?? NaN);
        const nextRound = Number.isFinite(round) && round > 0 ? round : null;
        setLatestRound(nextRound);

        if ((!hasAlgoPriceUsd && nextPrice == null) || nextRound == null) {
          const [priceFallbackRes, roundFallbackRes] = await Promise.allSettled([
            fetchAlgoPriceFallback(),
            fetchLatestRoundFallback(),
          ]);

          if (!hasAlgoPriceUsd && nextPrice == null && priceFallbackRes.status === "fulfilled") {
            const fallbackPrice = Number(priceFallbackRes.value ?? NaN);
            if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
              setAlgoUsdc(fallbackPrice);
            }
          }

          if (nextRound == null && roundFallbackRes.status === "fulfilled") {
            const fallbackRound = Number(roundFallbackRes.value ?? NaN);
            if (Number.isFinite(fallbackRound) && fallbackRound > 0) {
              setLatestRound(Math.floor(fallbackRound));
            }
          }
        }
      } else {
        const [roundFallbackRes] = await Promise.allSettled([fetchLatestRoundFallback()]);

        if (roundFallbackRes.status === "fulfilled") {
          const fallbackRound = Number(roundFallbackRes.value ?? NaN);
          if (Number.isFinite(fallbackRound) && fallbackRound > 0) {
            setLatestRound(Math.floor(fallbackRound));
          }
        }
      }

      if (loanInfoRes.status === "fulfilled") {
        const platformActiveLoans = Number(loanInfoRes.value?.protocolMetrics?.activeLoanWalletCount ?? NaN);
        const walletActiveLoan = Number(loanInfoRes.value?.lending?.activeLoan ?? NaN);
        const resolvedActiveLoans = Number.isFinite(platformActiveLoans)
          ? platformActiveLoans
          : Number.isFinite(walletActiveLoan)
            ? walletActiveLoan
            : NaN;
        setActiveLoans(Number.isFinite(resolvedActiveLoans) ? Math.max(0, Math.floor(resolvedActiveLoans)) : null);

        const minAura = Number(loanInfoRes.value?.unsecuredPolicy?.minAuraPoints ?? NaN);
        setMinAuraPoints(Number.isFinite(minAura) ? Math.max(0, Math.floor(minAura)) : null);

        const lendingAppId = Number(loanInfoRes.value?.lendingAppId ?? NaN);
        if (Number.isFinite(lendingAppId) && lendingAppId > 0) {
          setAppId(String(Math.floor(lendingAppId)));
        }
      }
    };

    load();
    const id = setInterval(load, 15_000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const fn = () => setShowScroll(window.scrollY < 100);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function magnetic(ref: React.RefObject<HTMLButtonElement | null>) {
    return {
      onMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
        const btn = ref.current;
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (Math.sqrt(dx * dx + dy * dy) < 70) {
          btn.style.transform = `translate(${dx * 0.2}px,${dy * 0.2}px)`;
        }
      },
      onMouseEnter() {
        const btn = ref.current;
        if (btn) btn.style.transition = "transform 0.1s ease, box-shadow 0.25s ease";
      },
      onMouseLeave() {
        const btn = ref.current;
        if (!btn) return;
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

  const panelStats = [
    { label: "TVL", val: formatAlgo(poolAlgo), accent: "#00FFD1", delay: 0.6 },
    { label: "SHARE_PRICE", val: formatSharePrice(sharePriceAlgo), accent: "#5EEBFF", delay: 0.72 },
    { label: "ALGO_PRICE", val: formatPrice(algoUsdc), accent: "#F0F0F0", delay: 0.84 },
    {
      label: "LATEST_POOL_ROUND",
      val: latestRound == null ? "--" : latestRound.toLocaleString("en-US"),
      accent: "#FFB347",
      delay: 0.96,
    },
    {
      label: "ACTIVE_LOANS",
      val: activeLoans == null ? "--" : activeLoans.toLocaleString("en-US"),
      accent: "#7B2FFF",
      delay: 1.08,
    },
  ];

  return (
    <section
      id="hero"
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr",
        alignItems: "stretch",
        overflow: "hidden",
      }}
    >
      <div
        className="hero-inner"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "120px 5vw 80px 6vw",
          position: "relative",
        }}
      >
        <h1
          className="font-display hero-title"
          style={{
            ...fadeIn(0.42),
            margin: "0 0 20px 0",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 0.9,
            color: "#F0F0F0",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "clamp(58px,7.2vw,108px)",
              color: "transparent",
              WebkitTextStroke: "1px rgba(0,255,209,0.65)",
            }}
          >
            AURA++
          </span>
          <span
            style={{
              display: "block",
              fontSize: "clamp(28px,3.4vw,48px)",
              color: "#F0F0F0",
              marginTop: 6,
            }}
          >
            in DeFi with
          </span>
          <span
            style={{
              display: "block",
              fontSize: "clamp(56px,6.8vw,102px)",
              color: "#F0F0F0",
              marginTop: 6,
            }}
          >
            <span style={{ color: "#F0F0F0" }}>Algo</span><span style={{ color: "#00FFD1" }}>Crefi</span>
          </span>
        </h1>

        <div
          className="hero-status"
          style={{
            ...fadeIn(0.2),
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "rgba(0,255,209,0.5)",
              letterSpacing: "0.1em",
            }}
          >
            &gt; TESTNET_LIVE
          </span>
          <div style={{ height: 1, width: 40, background: "rgba(0,255,209,0.3)" }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
            }}
          >
            block #{latestRound == null ? "SYNCING" : latestRound.toLocaleString("en-US")}
          </span>
        </div>

        <div
          className="hero-chart"
          style={{
            ...fadeIn(1.05),
            marginTop: 18,
            width: "100%",
            maxWidth: 760,
            height: 330,
            background: "linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <PoolValueChart
            poolBalanceMicro={
              Number.isFinite(poolAlgo ?? NaN) && (poolAlgo ?? 0) > 0
                ? Math.floor((poolAlgo ?? 0) * 1_000_000)
                : 0
            }
          />
        </div>

        <div
          className="hero-actions"
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
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 0 8px rgba(0,255,209,0.12),0 0 40px rgba(0,255,209,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translate(0,0)";
              e.currentTarget.style.transition =
                "transform 0.6s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.25s ease";
            }}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              e.currentTarget.style.color = "#F0F0F0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              e.currentTarget.style.transform = "translate(0,0)";
              e.currentTarget.style.transition =
                "transform 0.6s cubic-bezier(0.34,1.56,0.64,1),background 0.25s,border-color 0.25s,color 0.25s";
            }}
          >
            Read Docs →
          </button>
        </div>
      </div>

      <div
        className="hero-scroll"
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
        <div
          style={{
            width: 1,
            height: 32,
            background: "rgba(255,255,255,0.2)",
            animation: "bounce-down 1.5s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          scroll
        </span>
      </div>

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

      <style>{`
        @media (max-width: 768px) {
          #hero {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
          .hero-inner {
            padding: 104px 16px 112px 16px !important;
            justify-content: flex-start !important;
          }
          .hero-title {
            margin-bottom: 14px !important;
            line-height: 0.96 !important;
          }
          .hero-status {
            margin-bottom: 16px !important;
            flex-wrap: wrap !important;
            row-gap: 6px !important;
          }
          .hero-chart {
            height: 250px !important;
            max-width: 100% !important;
            border-radius: 14px !important;
          }
          .hero-actions {
            margin-top: 20px !important;
            width: 100% !important;
          }
          .hero-actions button {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            padding: 12px 14px !important;
          }
          .hero-scroll {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .hero-inner {
            padding: 94px 12px 108px 12px !important;
          }
          .hero-chart {
            height: 220px !important;
          }
          .hero-actions {
            gap: 8px !important;
            flex-direction: column !important;
          }
          .hero-actions button {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}
