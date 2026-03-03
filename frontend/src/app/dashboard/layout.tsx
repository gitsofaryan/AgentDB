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
    return <>{children}</>;
}
