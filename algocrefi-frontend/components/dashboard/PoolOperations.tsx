"use client";
import { useRef, useState } from "react";
import type { PoolInfo, UserInfo } from "@/lib/mockData";
import { useToast } from "./toastContext";
import { Buffer } from "buffer";
import { getWalletAddress } from "@/src/utils/authService";
import { buildDepositTxGroup, buildOptInTx, buildWithdrawTx } from "@/src/utils/algoTxBuilder";
import { algoToMicroAlgo, estimateAlgoFromShares, estimateShares, submitDeposit, submitOptIn, submitWithdraw } from "@/src/utils/poolService";
import { getStoredWalletType, signTransactions } from "@/src/utils/walletService";

interface Props {
  pool: PoolInfo;
  user: UserInfo;
  onRefresh: () => Promise<void>;
}

function RippleButton({
  children,
  onClick,
  loading,
  loadingLabel,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  loading?: boolean;
  loadingLabel?: string;
  style?: React.CSSProperties;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const id = Date.now();
    setRipples((p) => [...p, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), 600);
    onClick();
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={loading}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        background: "#00FFD1",
        color: "#05050A",
        border: "none",
        borderRadius: 12,
        padding: "14px",
        fontFamily: "Inter,sans-serif",
        fontSize: 15,
        fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        marginTop: 16,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.boxShadow = "0 0 0 6px rgba(0,255,209,0.1),0 0 32px rgba(0,255,209,0.25)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            marginLeft: -4,
            marginTop: -4,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.2)",
            transform: "scale(0)",
            animation: "ripple-expand 0.6s ease forwards",
            pointerEvents: "none",
          }}
        />
      ))}
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, border: "2px solid rgba(5,5,10,0.3)", borderTopColor: "#05050A", borderRadius: "50%", display: "inline-block", animation: "spin-cw 0.7s linear infinite" }} />
          {loadingLabel || "Signing..."}
        </span>
      ) : children}
    </button>
  );
}

export default function PoolOperations({ pool, user, onRefresh }: Props) {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState<string>("");
  const [infoOpen, setInfoOpen] = useState(false);
  const { addToast } = useToast();

  const amountNumber = Number(amount);
  const shareEstimate = !isNaN(amountNumber) && amountNumber > 0
    ? estimateShares(algoToMicroAlgo(amountNumber), pool)
    : null;
  const algoEstimate = !isNaN(amountNumber) && amountNumber > 0
    ? estimateAlgoFromShares(Math.floor(amountNumber), pool)
    : null;

  const encodeSignedTx = (signedTx: Uint8Array) => Buffer.from(signedTx).toString("base64");

  const failToast = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Transaction failed";
    addToast({ type: "error", title: "Action failed", message });
  };

  const getWalletSession = () => {
    const walletAddress = getWalletAddress();
    const walletType = getStoredWalletType();
    if (!walletAddress || !walletType) {
      throw new Error("Connect your wallet first");
    }
    return { walletAddress, walletType };
  };

  const handleDeposit = async () => {
    const parsed = Number(amount);
    const amountMicroAlgo = algoToMicroAlgo(parsed);

    if (!amount || isNaN(parsed) || parsed <= 0) {
      addToast({ type: "error", title: "Invalid amount", message: "Enter a valid amount" });
      return;
    }
    if (amountMicroAlgo < 1_000_000) {
      addToast({ type: "error", title: "Invalid amount", message: "Minimum deposit is 1 ALGO" });
      return;
    }

    try {
      const { walletAddress, walletType } = getWalletSession();

      if (user.shares === 0) {
        setLoading(true);
        setLoadingLabel("Signing opt-in...");
        try {
          const optInTx = await buildOptInTx(walletAddress);
          const [signedOptIn] = await signTransactions([optInTx], walletType);
          const optInBase64 = encodeSignedTx(signedOptIn);

          setLoadingLabel("Submitting opt-in...");
          await submitOptIn(optInBase64);
          addToast({ type: "success", title: "Opt-in confirmed", message: "Wallet opted into pool app" });
        } catch (optInError: unknown) {
          const optInMsg = optInError instanceof Error ? optInError.message : "Opt-in failed";
          const normalized = optInMsg.toLowerCase();
          const alreadyOpted =
            normalized.includes("already") ||
            normalized.includes("already in ledger") ||
            normalized.includes("has opted in") ||
            normalized.includes("has already opted in");

          if (!alreadyOpted) {
            throw optInError;
          }
        }
      }

      setLoading(true);
      setLoadingLabel("Building tx...");

      const [paymentTx, depositTx] = await buildDepositTxGroup(walletAddress, amountMicroAlgo);

      setLoadingLabel("Sign in wallet...");
      const signed = await signTransactions([paymentTx, depositTx], walletType);
      const [base64Payment, base64Deposit] = signed.map(encodeSignedTx);

      setLoadingLabel("Submitting...");
      const res = await submitDeposit([base64Payment, base64Deposit]) as { appTxId?: string; message?: string };

      addToast({
        type: "success",
        title: "Deposit submitted!",
        message: res.appTxId ? `Tx: ${res.appTxId}` : "Deposit submitted",
        txId: res.appTxId,
      });
      setAmount("");
      await onRefresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Transaction failed";
      if (message.toLowerCase().includes("already in ledger")) {
        addToast({ type: "success", title: "Deposit likely confirmed", message });
        setAmount("");
        await onRefresh();
      } else {
        failToast(error);
      }
    } finally {
      setLoading(false);
      setLoadingLabel("");
    }
  };

  const handleWithdraw = async () => {
    const shares = parseInt(amount, 10);
    if (!amount || isNaN(shares) || shares <= 0) {
      addToast({ type: "error", title: "Invalid amount", message: "Enter valid shares" });
      return;
    }
    if (shares > user.shares) {
      addToast({ type: "error", title: "Invalid amount", message: "Shares exceed your balance" });
      return;
    }

    try {
      const { walletAddress, walletType } = getWalletSession();
      setLoading(true);
      setLoadingLabel("Building tx...");

      const withdrawTx = await buildWithdrawTx(walletAddress, shares);

      setLoadingLabel("Sign in wallet...");
      const signed = await signTransactions([withdrawTx], walletType);
      const base64Withdraw = encodeSignedTx(signed[0]);

      setLoadingLabel("Submitting...");
      const res = await submitWithdraw(shares, base64Withdraw) as { appTxId?: string; message?: string };

      addToast({
        type: "success",
        title: "Withdrawal submitted!",
        message: res.appTxId ? `Tx: ${res.appTxId}` : "Withdrawal submitted",
        txId: res.appTxId,
      });
      setAmount("");
      await onRefresh();
    } catch (error: unknown) {
      failToast(error);
    } finally {
      setLoading(false);
      setLoadingLabel("");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (tab === "deposit") {
        await handleDeposit();
      } else {
        await handleWithdraw();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(0,255,209,0.35)", letterSpacing: "0.15em", marginBottom: 3 }}>
            // POOL_OPS
          </div>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "#F0F0F0", letterSpacing: "-0.03em", margin: 0 }}>
            Pool Operations
          </h2>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
          {(["deposit", "withdraw"] as const).map((t) => (
            <button
              key={t}
               onClick={() => { setTab(t); setAmount(""); }}
              style={{
                background: tab === t ? "rgba(0,255,209,0.1)" : "transparent",
                color: tab === t ? "#00FFD1" : "rgba(255,255,255,0.35)",
                border: "none",
                borderRadius: 8,
                padding: "6px 16px",
                fontFamily: "Inter,sans-serif",
                fontSize: 13,
                fontWeight: tab === t ? 500 : 400,
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div>
        <label style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>
          {tab === "deposit" ? "AMOUNT (ALGO)" : "SHARES TO WITHDRAW"}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12,
              padding: "14px 52px 14px 16px",
              color: "#F0F0F0",
              fontFamily: "Inter,sans-serif",
              fontSize: 16,
              fontWeight: 500,
              outline: "none",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#00FFD1";
              e.target.style.boxShadow = "0 0 0 3px rgba(0,255,209,0.07)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.09)";
              e.target.style.boxShadow = "none";
            }}
          />
          <button
            onClick={() => setAmount(tab === "deposit" ? "10" : String(user.shares))}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#00FFD1",
              fontFamily: "Inter,sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            MAX
          </button>
        </div>

        {/* Live estimate */}
        {amount && (
          <div style={{ padding: "10px 0", fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {tab === "deposit"
              ? `You'll receive ≈ ${shareEstimate ?? 0} shares`
              : `You'll receive ≈ ${(algoEstimate ?? 0).toFixed(4)} ALGO`}
          </div>
        )}
      </div>

      {/* Opt-in info */}
      <div
        style={{
          background: "rgba(0,255,209,0.03)",
          border: "1px solid rgba(0,255,209,0.09)",
          borderRadius: 10,
          padding: "10px 12px",
          marginTop: 12,
          cursor: "pointer",
        }}
        onClick={() => setInfoOpen(!infoOpen)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#00FFD1", fontSize: 13 }}>ⓘ</span>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            First deposit requires opt-in transaction.
          </span>
          <span style={{ marginLeft: "auto", color: "rgba(0,255,209,0.4)", fontSize: 11 }}>{infoOpen ? "▲" : "▼"}</span>
        </div>
        {infoOpen && (
          <div style={{ marginTop: 8, fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
            Two wallet signatures required: (1) opt-in to pool asset, (2) grouped deposit transaction. This is a one-time step per wallet.
          </div>
        )}
      </div>

      <RippleButton onClick={handleSubmit} loading={loading} loadingLabel={loadingLabel}>
        {tab === "deposit" ? "Deposit ALGO" : "Withdraw Shares"}
      </RippleButton>

      <style>{`
        @keyframes ripple-expand {
          to { transform:scale(40); opacity:0; }
        }
      `}</style>
    </div>
  );
}
