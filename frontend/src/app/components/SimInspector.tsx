"use client";

import React from "react";

export interface InspectedNode {
    id: string;
    type: "agent" | "ipfs" | "ucan" | "zama" | "ipns" | "gateway" | "registry" | "session" | "mcp" | "llm";
    label: string;
    did?: string;
    cid?: string;
    capabilities?: string[];
    expiry?: string;
    encryptionType?: string;
    gatewayMs?: number;
    metadata?: Record<string, string>;
    rawJson?: object;
}

interface SimInspectorProps {
    node: InspectedNode | null;
}

export default function SimInspector({ node }: SimInspectorProps) {
    const [activeTab, setActiveTab] = React.useState<"meta" | "json" | "proof" | "encryption">("meta");

    if (!node) {
        return (
            <div className="mc-inspector">
                <div className="mc-inspector-header">
                    <h3>Inspector</h3>
                </div>
                <div className="mc-inspector-empty">
                    <div className="mc-inspector-empty-icon">🔍</div>
                    <p>Click a node in the canvas to inspect it</p>
                    <p className="muted">View DIDs, CIDs, delegations, and encryption details</p>
                </div>
            </div>
        );
    }

    const iconMap: Record<string, string> = {
        agent: "🤖", ipfs: "🌐", ucan: "🔑", zama: "🛡️",
        ipns: "📡", gateway: "⚡", registry: "📋", session: "💾",
        mcp: "🖥️", llm: "🧠",
    };

    return (
        <div className="mc-inspector">
            <div className="mc-inspector-header">
                <div className="mc-inspector-node-badge">
                    <span className="icon">{iconMap[node.type] || "📦"}</span>
                    <div>
                        <h3>{node.label}</h3>
                        <span className="mc-inspector-type">{node.type.toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <div className="mc-inspector-tabs">
                {(["meta", "json", "proof", "encryption"] as const).map((tab) => (
                    <button
                        key={tab}
                        className={`mc-tab ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === "meta" ? "Metadata" : tab === "json" ? "Raw JSON" : tab === "proof" ? "Proof" : "Encryption"}
                    </button>
                ))}
            </div>

            <div className="mc-inspector-content">
                {activeTab === "meta" && (
                    <div className="mc-inspector-meta">
                        {node.did && <div className="mc-meta-row"><span className="label">DID</span><span className="value mono">{node.did}</span></div>}
                        {node.cid && <div className="mc-meta-row"><span className="label">CID</span><span className="value mono">{node.cid}</span></div>}
                        {node.capabilities && node.capabilities.length > 0 && (
                            <div className="mc-meta-row">
                                <span className="label">Capabilities</span>
                                <div className="mc-caps">{node.capabilities.map((c, i) => <span key={i} className="mc-cap-badge">{c}</span>)}</div>
                            </div>
                        )}
                        {node.expiry && <div className="mc-meta-row"><span className="label">Expiry</span><span className="value">{node.expiry}</span></div>}
                        {node.gatewayMs !== undefined && (
                            <div className="mc-meta-row">
                                <span className="label">Gateway Latency</span>
                                <span className="value" style={{ color: node.gatewayMs < 300 ? "#10b981" : node.gatewayMs < 600 ? "#f59e0b" : "#ef4444" }}>
                                    {node.gatewayMs}ms
                                </span>
                            </div>
                        )}
                        {node.metadata && Object.entries(node.metadata).map(([k, v]) => (
                            <div className="mc-meta-row" key={k}><span className="label">{k}</span><span className="value">{v}</span></div>
                        ))}
                    </div>
                )}
                {activeTab === "json" && (
                    <pre className="mc-inspector-json">{JSON.stringify(node.rawJson || node, null, 2)}</pre>
                )}
                {activeTab === "proof" && (
                    <div className="mc-inspector-proof">
                        <div className="mc-proof-chain">
                            <div className="mc-proof-step">
                                <span className="dot active" />
                                <span>Issuer: {node.did?.slice(0, 24) || "N/A"}...</span>
                            </div>
                            <div className="mc-proof-step">
                                <span className="dot" />
                                <span>Capability: {node.capabilities?.[0] || "agent/*"}</span>
                            </div>
                            <div className="mc-proof-step">
                                <span className="dot" />
                                <span>Expiry: {node.expiry || "∞"}</span>
                            </div>
                            <div className="mc-proof-step verified">
                                <span className="dot" />
                                <span>✅ Signature Valid</span>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === "encryption" && (
                    <div className="mc-inspector-meta">
                        <div className="mc-meta-row"><span className="label">Type</span><span className="value">{node.encryptionType || "None"}</span></div>
                        <div className="mc-meta-row"><span className="label">Algorithm</span><span className="value">Zama fhEVM TFHE</span></div>
                        <div className="mc-meta-row"><span className="label">Key Size</span><span className="value">256-bit</span></div>
                        <div className="mc-meta-row"><span className="label">Status</span><span className="value" style={{ color: "#10b981" }}>🔒 Secure</span></div>
                    </div>
                )}
            </div>
        </div>
    );
}
