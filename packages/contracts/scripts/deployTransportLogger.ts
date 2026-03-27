import hre from "hardhat";

async function main() {
  console.log("Deploying RECCOTransportLogger...");

  // @ts-ignore - ethers is injected by the plugin but TS is not picking it up in ESM mode
  const Logger = await hre.ethers.getContractFactory("RECCOTransportLogger");
  const logger = await Logger.deploy();

  await logger.waitForDeployment();

  const address = await logger.getAddress();
  console.log(`RECCOTransportLogger deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
