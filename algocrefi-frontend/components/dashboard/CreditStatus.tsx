"use client";

import { useEffect, useState } from "react";
import { Buffer } from "buffer";
import type { UserInfo } from "@/lib/mockData";
import { useToast } from "./toastContext";
import { getWalletAddress } from "@/src/utils/authService";
import { buildCollateralLoanGroup, buildRepayGroup, buildUnsecuredLoanTx } from "@/src/utils/algoTxBuilder";
import { algoToMicroAlgo } from "@/src/utils/poolService";
import {
  formatDueDate,
  getCollateralQuote,
  isLoanOverdue,
  submitCollateralLoan,
  submitRepay,
  submitUnsecuredLoan,
  usdcToDisplay,
} from "@/src/utils/loanService";
import { getStoredWalletType, signTransactions } from "@/src/utils/walletService";

interface Props {
  user: UserInfo;
  lending: {
    activeLoan: number;
    dueAmount: number;
    dueTs: number;
    netAuraPoints: number;
    unsecuredEligible: boolean;
    unsecuredCreditLimitMicroAlgo: number;
    blacklisted: number;
  };
  error?: string;
  onRefresh: () => Promise<void>;
}

type LoanMode = "none" | "collateral" | "unsecured" | "repay";

export default function CreditStatus({ user, lending, error, onRefresh }: Props) {
  const [arcOffset, setArcOffset] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loanMode, setLoanMode] = useState<LoanMode>("none");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [collateralDays, setCollateralDays] = useState("30");
  const [quote, setQuote] = useState<{ requiredCollateralUsdcUnits: number; estimatedDueMicroAlgo: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [unsecuredAmount, setUnsecuredAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLabel, setActionLabel] = useState("");
  const { addToast } = useToast();

  const r = 54;
  const cx = 65;
  const cy = 65;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(lending.netAuraPoints / 100, 1);
  const targetOffset = circ * (1 - pct);
  const unsecuredEligible = lending.unsecuredEligible;
  const unsecuredDisabled = !lending.unsecuredEligible || lending.blacklisted > 0;
  const overdue = isLoanOverdue(lending.dueTs);
  const dueDate = lending.dueTs > 0 ? formatDueDate(lending.dueTs) : null;
  const unsecuredLimitAlgo = lending.unsecuredCreditLimitMicroAlgo / 1_000_000;

  useEffect(() => {
    const t = setTimeout(() => setArcOffset(targetOffset), 300);
    return () => clearTimeout(t);
  }, [targetOffset]);

  useEffect(() => {
    if (loanMode !== "collateral") return;

    const amount = Number(collateralAmount);
    const days = Number(collateralDays) || 30;
    if (!amount || amount <= 0) {
      setQuote(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setQuoteLoading(true);
        const response = await getCollateralQuote(algoToMicroAlgo(amount), days) as {
          quote?: { requiredCollateralUsdcUnits: number; estimatedDueMicroAlgo: number };
        };
        if (response.quote) {
          setQuote({
            requiredCollateralUsdcUnits: Number(response.quote.requiredCollateralUsdcUnits || 0),
            estimatedDueMicroAlgo: Number(response.quote.estimatedDueMicroAlgo || 0),
          });
        }
      } catch {
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [loanMode, collateralAmount, collateralDays]);

  const getWalletSession = () => {
    const walletAddress = getWalletAddress();
    const walletType = getStoredWalletType();
    if (!walletAddress || !walletType) {
      throw new Error("Connect wallet first");
    }
    return { walletAddress, walletType };
  };

  const encodeSignedTx = (signedTx: Uint8Array) => Buffer.from(signedTx).toString("base64");

  const handleCollateralRequest = async () => {
    try {
      const amount = Number(collateralAmount);
      const days = Number(collateralDays) || 30;
      const algoAmountMicro = algoToMicroAlgo(amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid ALGO amount");
      if (!quote?.requiredCollateralUsdcUnits) throw new Error("Quote not ready");

      const { walletAddress, walletType } = getWalletSession();
      setActionLoading(true);
      setActionLabel("Building tx...");
      const [usdcTx, appCallTx] = await buildCollateralLoanGroup(walletAddress, algoAmountMicro, days, quote.requiredCollateralUsdcUnits);

      setActionLabel("Sign in wallet...");
      const signed = await signTransactions([usdcTx, appCallTx], walletType);

      setActionLabel("Submitting...");
      const res = await submitCollateralLoan(algoAmountMicro, days, signed.map(encodeSignedTx)) as { appTxId?: string };

      addToast({
        type: "success",
        title: "Collateral loan requested",
        message: res.appTxId ? `Tx: ${res.appTxId}` : undefined,
        txId: res.appTxId,
      });
      setLoanMode("none");
      setCollateralAmount("");
      await onRefresh();
    } catch (err: unknown) {
      addToast({ type: "error", title: "Collateral request failed", message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(false);
      setActionLabel("");
    }
  };

  const handleUnsecuredRequest = async () => {
    try {
      const amount = Number(unsecuredAmount);
      const algoAmountMicro = algoToMicroAlgo(amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid ALGO amount");
      if (algoAmountMicro > lending.unsecuredCreditLimitMicroAlgo) throw new Error("Amount exceeds unsecured credit limit");

      const { walletAddress, walletType } = getWalletSession();
      setActionLoading(true);
      setActionLabel("Building tx...");
      const tx = await buildUnsecuredLoanTx(walletAddress, algoAmountMicro, 30);

      setActionLabel("Sign in wallet...");
      const signed = await signTransactions([tx], walletType);

      setActionLabel("Submitting...");
      const res = await submitUnsecuredLoan(algoAmountMicro, 30, encodeSignedTx(signed[0])) as { appTxId?: string };

      addToast({
        type: "success",
        title: "Unsecured loan requested",
        message: res.appTxId ? `Tx: ${res.appTxId}` : undefined,
        txId: res.appTxId,
      });
      setLoanMode("none");
      setUnsecuredAmount("");
      await onRefresh();
    } catch (err: unknown) {
      addToast({ type: "error", title: "Unsecured request failed", message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(false);
      setActionLabel("");
    }
  };

  const handleRepay = async () => {
    try {
      if (!lending.dueAmount || lending.dueAmount <= 0) throw new Error("No due amount found");
      const { walletAddress, walletType } = getWalletSession();

      setActionLoading(true);
      setActionLabel("Building tx...");
      const [paymentTx, repayTx] = await buildRepayGroup(walletAddress, lending.dueAmount);

      setActionLabel("Sign in wallet...");
      const signed = await signTransactions([paymentTx, repayTx], walletType);

      setActionLabel("Submitting...");
      const res = await submitRepay(signed.map(encodeSignedTx)) as { appTxId?: string };

      addToast({
        type: "success",
        title: "Repayment submitted",
        message: res.appTxId ? `Tx: ${res.appTxId}` : undefined,
        txId: res.appTxId,
      });
      setLoanMode("none");
      await onRefresh();
    } catch (err: unknown) {
      addToast({ type: "error", title: "Repayment failed", message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setActionLoading(false);
      setActionLabel("");
    }
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,183,71,0.4)", letterSpacing: "0.15em", marginBottom: 3 }}>
          // CREDIT_STATUS
        </div>
        <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "#F0F0F0", letterSpacing: "-0.03em", margin: 0 }}>
          Credit Status
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: 130, height: 130 }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,183,71,0.08)" strokeWidth="8" />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#FFB347"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={arcOffset}
              style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>AURA</span>
            <span className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "#FFB347", lineHeight: 1, letterSpacing: "-0.03em" }}>
              {lending.netAuraPoints}
            </span>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>/ 100</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            background: unsecuredEligible ? "rgba(0,255,209,0.07)" : "rgba(255,183,71,0.07)",
            border: `1px solid ${unsecuredEligible ? "rgba(0,255,209,0.2)" : "rgba(255,183,71,0.2)"}`,
            borderRadius: 9999,
            padding: "5px 14px",
            fontFamily: "Inter,sans-serif",
            fontSize: 12,
            color: unsecuredEligible ? "#00FFD1" : "#FFB347",
          }}
        >
          {unsecuredEligible ? "✓ Eligible for unsecured loans" : `Earn ${Math.max(30 - lending.netAuraPoints, 0)} more pts`}
        </div>

        <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "NET", val: `${lending.netAuraPoints} pts`, color: "#FFB347" },
            { label: "PENALTY", val: `${user.auraPenalty} pts`, color: user.auraPenalty > 0 ? "#FF4444" : "rgba(255,255,255,0.3)" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>{row.label}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: row.color, fontWeight: 600 }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: -8, marginBottom: 12, fontFamily: "Inter,sans-serif", fontSize: 11, color: "#FF7777" }}>
          {error}
        </div>
      )}

      {lending.activeLoan > 0 ? (
        <div
          style={{
            background: "rgba(255,68,68,0.04)",
            border: `1px solid ${overdue ? "rgba(255,68,68,0.4)" : "rgba(255,68,68,0.15)"}`,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,68,68,0.5)", letterSpacing: "0.12em", marginBottom: 8 }}>
            ACTIVE_LOAN
          </div>
          <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "#F0F0F0" }}>
            {(lending.activeLoan / 1_000_000).toFixed(4)} ALGO
          </div>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: overdue ? "#FF4444" : "#FFB347", marginTop: 4 }}>
            {overdue ? "OVERDUE · " : "Due "}
            {dueDate}
          </div>

          {loanMode !== "repay" ? (
            <button
              style={{
                marginTop: 12,
                width: "100%",
                background: "rgba(255,68,68,0.1)",
                border: "1px solid rgba(255,68,68,0.3)",
                borderRadius: 10,
                padding: "10px",
                color: "#FF4444",
                fontFamily: "Inter,sans-serif",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
              onClick={() => setLoanMode("repay")}
            >
              Repay Now
            </button>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                Repaying: {(lending.dueAmount / 1_000_000).toFixed(4)} ALGO
              </div>
              <button
                disabled={actionLoading}
                onClick={handleRepay}
                style={{
                  width: "100%",
                  background: "#FF4444",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px",
                  color: "#FFFFFF",
                  fontFamily: "Inter,sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading ? actionLabel || "Processing..." : "Confirm Repay"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
          {loanMode === "collateral" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, display: "grid", gap: 8 }}>
              <input
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
                placeholder="ALGO Amount"
                type="number"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px", color: "#F0F0F0" }}
              />
              <input
                value={collateralDays}
                onChange={(e) => setCollateralDays(e.target.value)}
                placeholder="Days to Repay"
                type="number"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px", color: "#F0F0F0" }}
              />
              <div style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                {quoteLoading
                  ? "Fetching quote..."
                  : quote
                    ? `Required USDC collateral: ${usdcToDisplay(quote.requiredCollateralUsdcUnits)} USDC · Est. due amount: ${(quote.estimatedDueMicroAlgo / 1_000_000).toFixed(4)} ALGO`
                    : "Enter amount to load quote"}
              </div>
              <button
                disabled={actionLoading}
                onClick={handleCollateralRequest}
                style={{ background: "#7B2FFF", border: "none", borderRadius: 8, padding: "10px", color: "#F0F0F0", fontFamily: "Inter,sans-serif", fontWeight: 600, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? actionLabel || "Processing..." : "Request Loan"}
              </button>
            </div>
          )}

          {loanMode === "unsecured" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, display: "grid", gap: 8 }}>
              <input
                value={unsecuredAmount}
                onChange={(e) => setUnsecuredAmount(e.target.value)}
                placeholder={`ALGO Amount (max ${unsecuredLimitAlgo.toFixed(4)})`}
                type="number"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px", color: "#F0F0F0" }}
              />
              <button
                disabled={actionLoading}
                onClick={handleUnsecuredRequest}
                style={{ background: "#FFB347", border: "none", borderRadius: 8, padding: "10px", color: "#05050A", fontFamily: "Inter,sans-serif", fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? actionLabel || "Processing..." : "Request Unsecured Loan"}
              </button>
            </div>
          )}

          <button
            style={{
              background: "rgba(123,47,255,0.06)",
              border: "1px solid rgba(123,47,255,0.28)",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#7B2FFF",
              fontFamily: "Inter,sans-serif",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "left",
            }}
            onClick={() => setLoanMode((prev) => (prev === "collateral" ? "none" : "collateral"))}
          >
            Collateral Loan →
            <span style={{ display: "block", fontSize: 11, color: "rgba(123,47,255,0.6)", marginTop: 2 }}>USDC · 150% LTV</span>
          </button>

          <div style={{ position: "relative" }}>
            <button
              disabled={unsecuredDisabled}
              style={{
                width: "100%",
                background: "rgba(255,183,71,0.06)",
                border: "1px solid rgba(255,183,71,0.25)",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#FFB347",
                fontFamily: "Inter,sans-serif",
                fontSize: 14,
                fontWeight: 500,
                cursor: unsecuredDisabled ? "not-allowed" : "pointer",
                opacity: unsecuredDisabled ? 0.35 : 1,
                transition: "all 0.2s ease",
                textAlign: "left",
              }}
              onMouseEnter={() => {
                if (unsecuredDisabled) setShowTooltip(true);
              }}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => {
                if (!unsecuredDisabled) {
                  setLoanMode((prev) => (prev === "unsecured" ? "none" : "unsecured"));
                }
              }}
            >
              Unsecured Loan →
              <span style={{ display: "block", fontSize: 11, color: "rgba(255,183,71,0.5)", marginTop: 2 }}>No collateral required</span>
            </button>
            {showTooltip && unsecuredDisabled && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(8,8,18,0.95)",
                  border: "1px solid rgba(255,183,71,0.2)",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontFamily: "Inter,sans-serif",
                  fontSize: 12,
                  color: "#FFB347",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                {lending.blacklisted > 0 ? "Wallet blacklisted for unsecured loan" : `Need 30 AURA pts (have ${lending.netAuraPoints})`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
