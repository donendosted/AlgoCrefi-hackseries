import { apiRequest } from "./apiClient";

export type LoanStatusResponse = {
  lending?: {
    activeLoan?: number;
    dueAmount?: number;
    dueTs?: number;
    netAuraPoints?: number;
    unsecuredEligible?: boolean;
    unsecuredCreditLimitMicroAlgo?: number;
    blacklisted?: number;
  };
  aura?: {
    penalty?: number;
  };
  [key: string]: unknown;
};

export async function getLoanStatus() {
  return apiRequest<LoanStatusResponse>("/api/loan/status");
}

export async function getLoanStatusPublic(walletAddress: string) {
  return apiRequest<LoanStatusResponse>(`/api/loan/status/${walletAddress}`, { auth: false });
}

export async function getCollateralQuote(algoAmount: number, daysToRepay: number) {
  return apiRequest("/api/loan/collateral/quote", {
    method: "POST",
    body: { algoAmount, daysToRepay },
  });
}

export async function submitLendingOptIn(signedOptInTx: string) {
  return apiRequest("/api/loan/lending/opt-in", {
    method: "POST",
    body: { signedOptInTx },
  });
}

export async function submitAuraOptIn(signedOptInTx: string) {
  return apiRequest("/api/loan/aura/opt-in", {
    method: "POST",
    body: { signedOptInTx },
  });
}

export async function submitCollateralLoan(algoAmount: number, daysToRepay: number, signedGroupTxs: string[]) {
  return apiRequest("/api/loan/collateral/request", {
    method: "POST",
    body: { algoAmount, daysToRepay, signedGroupTxs },
  });
}

export async function submitUnsecuredLoan(algoAmount: number, daysToRepay: number, signedAppTx: string) {
  return apiRequest("/api/loan/unsecured/request", {
    method: "POST",
    body: { algoAmount, daysToRepay, signedAppTx },
  });
}

export async function submitRepay(signedGroupTxs: string[]) {
  return apiRequest("/api/loan/repay", {
    method: "POST",
    body: { signedGroupTxs },
  });
}

export function isLoanOverdue(dueTs: number) {
  return dueTs > 0 && Date.now() / 1000 > dueTs;
}

export function formatDueDate(dueTs: number) {
  return new Date(dueTs * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function usdcToDisplay(units: number) {
  return (units / 1_000_000).toFixed(2);
}
