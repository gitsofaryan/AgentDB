# 🌍 AgentDB Global Visualization

This is the front-end dashboard for **AgentDB**, providing a real-time global visualization of agent identity registrations and memory pins across the decentralized web.

## 🚀 Features
- **Interactive 3D Globe**: Built with Three.js and React-Globe, visualizing agent activity across the Filecoin/IPFS network.
- **Real-time CID Tracking**: Watch as agents pin new context to Storacha in real-time.
- **Identity Registry**: View agent DIDs as they register on the Filecoin Calibration testnet.

## 🛠️ Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Ensure you have the RPC URLs for Filecoin Calibration and Zama Sephora if you want to see live on-chain events.

3. **Run the Dashboard**:
   ```bash
   npm run dev
   ```

4. **Access the UI**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Tech Stack
- **Framework**: Next.js (App Router)
- **Visualization**: Three.js / React-Globe.gl
- **Web3**: Ethers.js
- **Styling**: Tailwind CSS
