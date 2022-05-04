import React from "react";
import { List, Spin } from "antd";
import { Address } from "../components";
import { useCurrentOwners } from "../hooks";
import { useTransactions } from "../context";

export default function Owners({ ownerEvents, signaturesRequired, mainnetProvider, blockExplorer, address }) {
  const { owners: peers } = useTransactions();
  const owners = useCurrentOwners({ ownerEvents });
  return (
    <div>
      <h2 style={{ marginTop: 32 }}>
        Signatures Required: {signaturesRequired ? signaturesRequired.toNumber() : <Spin></Spin>}
      </h2>
      <List
        style={{ maxWidth: 400, margin: "auto", marginTop: 32 }}
        bordered
        dataSource={owners}
        renderItem={ownerAddress => {
          const isCurrentWallet = ownerAddress === address;
          return (
            <List.Item key={"owner_" + ownerAddress}>
              {isCurrentWallet ? (
                <h1>Current wallet</h1>
              ) : (
                <Address
                  address={ownerAddress}
                  ensProvider={mainnetProvider}
                  blockExplorer={blockExplorer}
                  fontSize={32}
                />
              )}
              <div style={{ padding: 16 }}>{peers[ownerAddress] || isCurrentWallet ? "🌐" : "🚫"}</div>
            </List.Item>
          );
        }}
      />
    </div>
  );
}
