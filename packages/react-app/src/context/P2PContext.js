import Peer from "peerjs";
import { useState, useEffect, createContext, useContext } from "react";

/**
 * P2P context for using a p2p connection throughout app
 */
export const P2PProvider = ({ walletAddress, contractAddress, children }) => {
  const [client, setClient] = useState();
  useEffect(() => {
    // TODO: shouldn't be here without these
    if (contractAddress && walletAddress) {
      const peerId = `${contractAddress}-${walletAddress}`;
      console.log(`P2P: Connecting as ${peerId}`);
      const p2p = new Peer(peerId);
      setClient(p2p);
      p2p.on("open", () => {
        console.log("P2P: Connected", p2p);
      });
      p2p.on("error", err => {
        console.error("P2P: Error", err);
      });
      p2p.on("disconnected", () => {
        console.warn("P2P: Disconnected");
      });
      p2p.on("connection", conn => {
        console.log(`P2P: Connection from`, conn);
      });
      return () => {
        p2p && p2p.destroy();
      };
    } else {
      if (!contractAddress) {
        console.log(`P2P: Waiting for contractAddress`);
      }
      if (!walletAddress) {
        console.log(`P2P: Waiting for walletAddress`);
      }
    }
  }, [contractAddress, walletAddress]);
  return <P2PContext.Provider value={{ client }}>{children}</P2PContext.Provider>;
};

export const useP2P = () => useContext(P2PContext);
export const P2PContext = createContext();
