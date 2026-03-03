import { create } from '@storacha/client';
import * as fs from 'node:fs/promises';

async function main() {
    console.log("Setting up Storacha Space for the SDK...");
    
    // Create the client
    const client = await create();
    console.log("SDK Agent DID:", client.agent.did());
    
    try {
        console.log("Creating new Space 'AgentDB-Workspace'...");
        const space = await client.createSpace('AgentDB-Workspace');
        
        console.log("Authorizing agent to use space...");
        const myAccount = await client.login(process.env.STORACHA_EMAIL || 'mail.aryan.jain07@gmail.com');
        
        // Wait for user to click the link in their email
        console.log("Please check your email and click the confirmation link...");
        
        while (true) {
            const res = await myAccount.plan.get();
            if (res.ok) break;
            console.log("Waiting for email confirmation...");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        console.log("Email confirmed! Provisioning space...");
        await myAccount.provision(space.did());
        
        console.log("Saving space to client...");
        await space.save();
        await client.setCurrentSpace(space.did());
        
        console.log("Space setup complete!");
        
    } catch (error) {
        console.error("Setup failed:", error);
    }
}

main().catch(console.error);
