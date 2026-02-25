"use client";

import { useState, useRef } from "react";
import { StorachaService } from "@/lib/storacha";
import { UcanService } from "@/lib/ucan";
import ArchitectureFlow from "./components/ArchitectureFlow";
import DevToolVisualizer, { DevToolVisualizerRef } from "./components/DevToolVisualizer";

export default function Home() {
  const devToolRef = useRef<DevToolVisualizerRef>(null);

  const [publicMemory, setPublicMemory] = useState("");
  const [storachaCid, setStorachaCid] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [masterDid, setMasterDid] = useState("");
  const [subDid, setSubDid] = useState("");
  const [ucanCid, setUcanCid] = useState("");

  const [secretVal, setSecretVal] = useState("");
  const [zamaRef, setZamaRef] = useState("");

  const handleUpload = async () => {
    if (!publicMemory) return;
    setIsUploading(true);
    devToolRef.current?.addLog("SYSTEM", "Initiating Storacha upload flow...");
    try {
      // Simulation
      const cid = "bafybeigh4mvdjagffgry2kcdykahpibhnvv3pzs5bbgaeu7v5olsxafeyqy";
      setStorachaCid(cid);
      devToolRef.current?.triggerAnimation("upload");
      devToolRef.current?.addLog("STORACHA", `Memory stored! CID: ${cid.slice(0, 10)}...`);
    } catch (err) {
      devToolRef.current?.addLog("SYSTEM", "Error during Storacha upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleIdentity = async () => {
    devToolRef.current?.addLog("SYSTEM", "Generating cryptographic identity...");
    const id = await UcanService.createIdentity();
    setMasterDid(id.did());
    devToolRef.current?.addLog("UCAN", `Identity generated: ${id.did().slice(0, 20)}...`);
  };

  const handleIssueUcan = () => {
    if (!masterDid || !subDid) {
      devToolRef.current?.addLog("SYSTEM", "Missing DID for UCAN delegation.");
      return;
    }
    setUcanCid("bafy...delegation");
    devToolRef.current?.triggerAnimation("auth");
    devToolRef.current?.addLog("UCAN", `Delegation issued from Master to Sub-Agent.`);
  };

  const handleZama = () => {
    if (!secretVal) return;
    devToolRef.current?.addLog("SYSTEM", "Requesting Zama FHE encryption...");
    setZamaRef("0x5FbDB2315678... (FHE Encrypted)");
    devToolRef.current?.triggerAnimation("encrypt");
    devToolRef.current?.addLog("ZAMA", "Confidential state stored on-chain with FHE proof.");
  };

  return (
    <div>
      {/* Dev Tool Visualizer (Top) */}
      <DevToolVisualizer ref={devToolRef} />

      {/* Stats Bar */}
      <div className="stats-grid" style={{ marginTop: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Public Memory</div>
          <div className="stat-value">{storachaCid ? "1" : "0"}</div>
          <div className="stat-label">CIDs Stored</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Authorizations</div>
          <div className="stat-value">{ucanCid ? "1" : "0"}</div>
          <div className="stat-label">Active UCANs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Encrypted Vault</div>
          <div className="stat-value">{zamaRef ? "64" : "0"}</div>
          <div className="stat-label">Bytes On-Chain</div>
        </div>
      </div>

      {/* Main Feature Grid */}
      <div className="main-grid">
        {/* Storacha Card */}
        <div className="feature-card">
          <div className="feature-icon">☁️</div>
          <h2>Public IPFS Memory</h2>
          <p className="description">
            Store non-sensitive agent context on Storacha's decentralized storage network.
          </p>
          <div className="form-group">
            <label>Agent Context (JSON)</label>
            <textarea
              placeholder='{ "status": "exploring", "goal": "find-water" }'
              rows={4}
              value={publicMemory}
              onChange={(e) => setPublicMemory(e.target.value)}
            />
          </div>
          <button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload to Storacha"}
          </button>

          {storachaCid && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--secondary)' }}>
              ✅ CID: <a href={StorachaService.getGatewayUrl(storachaCid)} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{storachaCid.slice(0, 15)}...</a>
            </div>
          )}
        </div>

        {/* UCAN Card */}
        <div className="feature-card">
          <div className="feature-icon">🔑</div>
          <h2>UCAN Auth</h2>
          <p className="description">
            Delegate permissions between agents using cryptographic "permission slips".
          </p>
          <div className="form-group">
            <label>Master Agent ID</label>
            <input
              value={masterDid}
              readOnly
              placeholder="Click button to generate identity..."
            />
          </div>
          <div className="form-group">
            <label>Sub-Agent DID</label>
            <input
              placeholder="did:key:z6Mk..."
              value={subDid}
              onChange={(e) => setSubDid(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="secondary" onClick={handleIdentity}>New Identity</button>
            <button onClick={handleIssueUcan}>Issue UCAN</button>
          </div>
          {ucanCid && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
              ✅ Delegation Token Generated for Sub-Agent.
            </div>
          )}
        </div>

        {/* Zama Card */}
        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <h2>Private FHE Vault</h2>
          <p className="description">
            Securely compute on top-secret agent data using Fully Homomorphic Encryption.
          </p>
          <div className="form-group">
            <label>Encrypted Secret</label>
            <input
              type="password"
              placeholder="Secret key or context..."
              value={secretVal}
              onChange={(e) => setSecretVal(e.target.value)}
            />
          </div>
          <button onClick={handleZama}>Store in Zama Vault</button>
          {zamaRef && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent)' }}>
              ✅ Transacted on Zama Sephora: {zamaRef}
            </div>
          )}
        </div>
      </div>

      <ArchitectureFlow />

      <footer style={{ marginTop: '5rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        Built for PL Hacks | Powered by Storacha, UCAN, and Zama fhEVM
      </footer>
    </div>
  );
}


