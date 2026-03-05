import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Write proof.ucan from STORACHA_PROOF env var (for Vercel/serverless)
// The SDK reads proof.ucan from process.cwd() to authenticate with Storacha
const proofPath = join(process.cwd(), '..', 'proof.ucan');

if (!existsSync(proofPath) && process.env.STORACHA_PROOF) {
    try {
        const proofData = Buffer.from(process.env.STORACHA_PROOF, 'base64');
        writeFileSync(proofPath, proofData);
        console.log('[Prebuild] ✅ Wrote proof.ucan from STORACHA_PROOF env var');
    } catch (err) {
        console.warn('[Prebuild] ⚠️ Failed to write proof.ucan:', err);
    }
} else if (existsSync(proofPath)) {
    console.log('[Prebuild] ✅ proof.ucan already exists');
} else {
    console.warn('[Prebuild] ⚠️ No STORACHA_PROOF env var found — pinning will not work');
}
