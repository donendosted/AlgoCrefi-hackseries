import { WalletManager, WalletId, NetworkId } from "@txnlab/use-wallet-react";
import { createRainbowKitConfig, getDefaultConfig } from "@txnlab/use-wallet-ui-react/rainbowkit";
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { algorandChain } from "algo-x-evm-sdk";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-walletconnect-project-id";
export const wagmiConfig = getDefaultConfig({
  appName: "AlgoCrefi xChain",
  projectId: walletConnectProjectId,
  chains: [algorandChain],
  wallets: [
    {
      groupName: "xChain EVM",
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet],
    },
  ],
});

export const rainbowKitConfig = createRainbowKitConfig({
  wagmiConfig,
});

export const walletManager = new WalletManager({
  wallets: [
    {
      id: WalletId.RAINBOWKIT,
      options: {
        wagmiConfig,
        getEvmAccounts: rainbowKitConfig.getEvmAccounts,
      },
    },
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.LUTE,
  ],
  defaultNetwork: NetworkId.TESTNET,
});

export const walletUiTheme = "system" as const;

export const hasWalletConnectConfig = walletConnectProjectId !== "demo-walletconnect-project-id";
