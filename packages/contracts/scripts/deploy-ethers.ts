import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load from project root .env.local
dotenv.config({ path: "../../.env.local" });

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology";
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY is missing");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying RECCOTransportLogger from:", wallet.address);

  // Read ABI & Bytecode
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "src",
    "transport",
    "RECCOTransportLogger.sol",
    "RECCOTransportLogger.json"
  );
  
  const artifactFile = fs.readFileSync(artifactPath, "utf8");
  const artifact = JSON.parse(artifactFile);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log(`RECCOTransportLogger deployed to: ${address}`);
}

main().catch(console.error);
