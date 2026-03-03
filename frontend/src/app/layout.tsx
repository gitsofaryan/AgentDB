import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://agent-db.vercel.app"),
  title: {
    default: "Agent DB | Decentralized Memory for AI Agents",
    template: "%s | Agent DB"
  },
  description:
    "Persistent, encrypted, and permission-controlled memory for autonomous AI agents powered by IPFS, UCAN, and Storacha. Built during PL Genesis Hackathon.",
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
    "PL Genesis Hackathon",
    "Zero Knowledge Memory",
    "FHE Memory"
  ],
  authors: [{ name: "AgentDB Team" }],
  category: "technology",
  alternates: {
    canonical: "https://agent-db.vercel.app",
  },
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Agent DB",
    "operatingSystem": "Linux, Windows, macOS",
    "applicationCategory": "DeveloperApplication",
    "description": "Persistent, encrypted, and permission-controlled memory for autonomous AI agents.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Organization",
      "name": "AgentDB Team"
    }
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
