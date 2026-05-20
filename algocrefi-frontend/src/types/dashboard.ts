export type DashboardPool = {
  balance: number;
  totalShares: number;
  sharePrice: number;
  utilizationPct: number;
};

export type DashboardUser = {
  address: string;
  shares: number;
  auraPoints: number;
  auraPenalty: number;
  optedIn?: boolean;
};
