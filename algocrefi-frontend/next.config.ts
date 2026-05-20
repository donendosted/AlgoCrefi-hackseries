import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  transpilePackages: [
    "@d13co/algo-x-evm-ui",
    "@d13co/use-wallet-ui-react",
    "algo-x-evm-sdk",
  ],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      buffer: require.resolve("buffer/"),
      "@react-native-async-storage/async-storage": false,
      "@web3auth/base": false,
      "@web3auth/base-provider": false,
      "@web3auth/modal": false,
      "@web3auth/single-factor-auth": false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;