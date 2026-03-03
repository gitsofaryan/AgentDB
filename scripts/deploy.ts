import { ethers } from "hardhat";

async function main() {
  console.log("Preparing to deploy Zama Contracts (Sephora Testnet)...");
  
  const EncryptedAgentMemory = await ethers.getContractFactory("EncryptedAgentMemory");
  const encryptedMemory = await EncryptedAgentMemory.deploy();
  await encryptedMemory.waitForDeployment();
  console.log(`✅ EncryptedAgentMemory deployed to: ${await encryptedMemory.getAddress()}`);

  const ConfidentialFinance = await ethers.getContractFactory("ConfidentialFinance");
  const confidentialFinance = await ConfidentialFinance.deploy();
  await confidentialFinance.waitForDeployment();
  console.log(`✅ ConfidentialFinance deployed to: ${await confidentialFinance.getAddress()}`);

  console.log("--------------------------------------------------");
  console.log("Protocol Integration Overview:");
  console.log("1. Multi-Agent Memory -> IPFS (Storacha)");
  console.log("2. Private Agent Secrets -> EncryptedAgentMemory");
  console.log("3. Risk Thresholds -> ConfidentialFinance");
  console.log("4. Sovereign Access -> UCAN Delegations");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
