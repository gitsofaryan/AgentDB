import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Agent Vault | Decentralized Memory Dashboard",
    description: "Securely manage your AI agent's decentralized memory, delegations, and encrypted secrets.",
    alternates: {
        canonical: "https://agent-db.vercel.app/dashboard",
    },
    openGraph: {
        title: "Agent Vault Dashboard",
        description: "Control center for AgentDB memories and permissions.",
        url: "https://agent-db.vercel.app/dashboard",
        type: "website",
    },
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
