import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://agent-db.vercel.app"),
  title: "Agent DB | Decentralized Memory for AI Agents",
  description:
    "Persistent, encrypted, and permission-controlled memory for autonomous AI agents powered by IPFS, UCAN, and Storacha.",
  keywords: [
    "AI Agents",
    "Decentralized Memory",
    "IPFS",
    "UCAN",
    "Storacha",
    "AgentDB",
    "Blockchain AI",
    "Permanent Knowledge Graph",
    "Multi-agent Systems",
    "Autonomous Agents",
    "Self-sovereign Identity",
    "Web3 AI",
    "Distributed Context",
    "PL Genesis Hackathon"
  ],
  authors: [{ name: "AgentDB Team" }],
  category: "technology",
  openGraph: {
    title: "Agent DB | Decentralized Memory for AI Agents",
    description: "The sovereign, permanent, and collaborative memory layer for AI agents. Built for the decentralized AI future.",
    url: "https://agent-db.vercel.app",
    siteName: "Agent DB",
    images: [
      {
        url: "/favicon.png",
        width: 512,
        height: 512,
        alt: "Agent DB Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent DB | Decentralized Memory for AI Agents",
    description: "Sovereign memory for AI agents. Built during PL Genesis Hackathon on IPFS.",
    images: ["/favicon.png"],
    creator: "@arienjain",
  },
  icons: {
    icon: "/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
