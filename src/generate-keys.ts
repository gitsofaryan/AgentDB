import { create } from '@storacha/client';

async function main() {
  console.log("Creating Storacha Client and generating Agent Identity...");
  
  // The 'create' function automatically creates a new agent identity if none exists
  const client = await create();
  const agent = client.agent;

  console.log("\n✅ Agent Identity Generated!");
  console.log("--------------------------------------------------");
  console.log("AGENT DID (Public ID):");
  console.log(agent.issuer.did());
  console.log("--------------------------------------------------");
  
  // We need to export the private key. 
  // In the new Storacha client, we can export the whole agent state
  // or just the signer's key.
  
  console.log("\nNext Step: Account Registration");
  console.log("Run the following command in your terminal to link your email:");
  console.log(`\nnpx storacha login your-email@example.com`);
}

main().catch(console.error);
