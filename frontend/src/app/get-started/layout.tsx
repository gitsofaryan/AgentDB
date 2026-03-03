import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Get Started | Agent DB Setup Guide",
    description: "Install the Agent DB SDK and learn how to provision decentralized memory for your AI agents in under 5 minutes.",
    openGraph: {
        title: "Get Started with Agent DB",
        description: "Quick-start guide for decentralized AI agent memory.",
        url: "https://agent-db.vercel.app/get-started",
    },
};

export default function GetStartedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
