import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Vault | Decentralized AI Memory",
  description: "Secure, persistent, and authorized memory for AI Agents using IPFS, UCAN, and Zama FHE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="dashboard-container">
          <header>
            <div className="logo">AGENT VAULT</div>
            <div className="status-badge">
              <span className="status-dot"></span>
              Mainnet-v1 Ready
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
