import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

// P8: Use short paths on Windows to avoid ENAMETOOLONG errors.
// Run with: npx hardhat compile
// Or use WSL if path issues persist.

const config: HardhatUserConfig = {
    solidity: "0.8.24",
    paths: {
        sources: "./src",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    networks: {
        amoy: {
            type: "http",
            url: process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
            accounts: process.env.BLOCKCHAIN_PRIVATE_KEY
                ? [process.env.BLOCKCHAIN_PRIVATE_KEY]
                : [],
            chainId: 80002,
        },
    },
};

export default config;
