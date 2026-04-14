import { apiRequest } from "./apiClient";

const TOKEN_KEY = "algocrefi_token";
const WALLET_KEY = "algocrefi_wallet";
const WALLET_TYPE_KEY = "algocrefi_wallet_type";

type AuthResponse = {
  token?: string;
  [key: string]: unknown;
};

export async function login(walletAddress: string, password: string) {
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { walletAddress, password },
    auth: false,
  });

  if (typeof window !== "undefined") {
    if (response.token) {
      localStorage.setItem(TOKEN_KEY, response.token);
    }
    localStorage.setItem(WALLET_KEY, walletAddress);
  }

  return response;
}

export async function signup(walletAddress: string, password: string) {
  return apiRequest("/api/auth/signup", {
    method: "POST",
    body: { walletAddress, password },
    auth: false,
  });
}

export function logout() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(WALLET_KEY);
  localStorage.removeItem(WALLET_TYPE_KEY);
  window.location.href = "/";
}

export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function getWalletAddress() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WALLET_KEY);
}
