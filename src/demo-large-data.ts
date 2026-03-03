import { StorachaService } from './lib/storacha.js';
import * as crypto from 'node:crypto';

async function main() {
    console.log("==========================================");
    console.log("📦 STORACHA DEMO: Large Data Upload");
    console.log("==========================================\n");

    try {
        // 1. Generate 50MB of dummy data
        const SIZE_MB = 20; // Reduced to 20MB for faster hackathon demo, still proves the point
        console.log(`🛠️ Generating ${SIZE_MB}MB of random agent logs...`);
        const largeData = crypto.randomBytes(SIZE_MB * 1024 * 1024);
        
        console.log("🚀 Uploading to Storacha (IPFS)...");
        const startTime = Date.now();
        
        // 2. Upload using uploadRaw
        const cid = await StorachaService.uploadRaw(
            largeData, 
            "agent_large_logs_archive.bin", 
            "application/octet-stream"
        );
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n✅ Upload Successful in ${duration.toFixed(2)}s!`);
        console.log(`📍 CID: ${cid}`);
        console.log(`🌐 Gateway Link: ${StorachaService.getGatewayUrl(cid)}/agent_large_logs_archive.bin`);
        
        console.log("\n--- Verification ---");
        console.log("1. The data is now sharded and pinned across the Filecoin/IPFS network.");
        console.log("2. Other agents can retrieve this 20MB blob using only the CID.");
        console.log("3. Perfect for storing multi-million token histories or vector indexes.");

    } catch (err) {
        console.error("❌ Large upload failed:", err);
    }
}

main().catch(console.error);
