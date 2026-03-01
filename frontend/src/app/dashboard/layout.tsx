import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Agent Vault Dashboard | Decentralized AI Memory",
    description: "Live dashboard to upload IPFS memories, issue UCAN delegations, and store FHE-encrypted secrets.",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dashboard-container">
            <header>
                <div className="logo">AGENT VAULT</div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <a
                        href="/landing"
                        style={{
                            fontSize: "0.82rem",
                            color: "#a1a1aa",
                            textDecoration: "none",
                            padding: "0.35rem 0.8rem",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "8px",
                            transition: "all 0.2s",
                        }}
                    >
                        ← About
                    </a>
                    <div className="status-badge">
                        <span className="status-dot"></span>
                        Mainnet-v1 Ready
                    </div>
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
