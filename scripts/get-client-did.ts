import { create } from '@storacha/client';

async function main() {
    const client = await create();
    console.log("Client DID:", client.agent.did());
}
main().catch(console.error);
