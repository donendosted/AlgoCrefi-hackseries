export interface PoolInfo {
  balance: number;       // microALGO
  sharePrice: number;    // in ALGO (e.g. 1.0031)
  totalShares: number;
  utilizationPct: number;
}

export interface UserInfo {
  address: string;
  shares: number;
  auraPoints: number;
  auraPenalty: number;
}

export interface LoanStatus {
  activeLoan: number;    // ALGO, 0 if none
  dueDate: string | null;
  isOverdue: boolean;
  collateralType: "USDC" | null;
}

export const MOCK_POOL: PoolInfo = {
  balance: 54030_000_000,   // microALGO
  sharePrice: 1.0031,
  totalShares: 53863,
  utilizationPct: 67,
};

export const MOCK_USER: UserInfo = {
  address: "ALGO3X...F9KT",
  shares: 1200,
  auraPoints: 1,
  auraPenalty: 0,
};

export const MOCK_LOAN: LoanStatus = {
  activeLoan: 0,
  dueDate: null,
  isOverdue: false,
  collateralType: null,
};

// Generate 60 realistic ALGO/USDC candles
function generateCandles(count: number) {
  const now = Math.floor(Date.now() / 1000);
  const interval = 60 * 60; // 1h
  let price = 0.31;
  return Array.from({ length: count }, (_, i) => {
    const open = parseFloat(price.toFixed(4));
    const change = (Math.random() - 0.49) * 0.008;
    const close = parseFloat(Math.max(0.25, open + change).toFixed(4));
    const high = parseFloat((Math.max(open, close) + Math.random() * 0.003).toFixed(4));
    const low = parseFloat((Math.min(open, close) - Math.random() * 0.003).toFixed(4));
    const volume = Math.floor(Math.random() * 80000 + 20000);
    price = close;
    return {
      time: now - (count - i) * interval,
      open, high, low, close,
      value: volume,
      color: close >= open ? "rgba(0,255,209,0.3)" : "rgba(255,68,68,0.3)",
    };
  });
}

export const MOCK_CANDLES = generateCandles(60);
