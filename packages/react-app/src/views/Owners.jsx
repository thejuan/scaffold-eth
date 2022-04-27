import React from "react";
import { List, Spin } from "antd";
import { Address } from "../components";
import { useTransactions } from "../context";

export default function Owners({ ownerEvents, signaturesRequired, mainnetProvider, blockExplorer, address }) {
  const { owners } = useTransactions();

  return (
    <div>
      <h2 style={{ marginTop: 32 }}>
        Signatures Required: {signaturesRequired ? signaturesRequired.toNumber() : <Spin></Spin>}
      </h2>
      <List
        style={{ maxWidth: 400, margin: "auto", marginTop: 32 }}
        bordered
        dataSource={ownerEvents}
        renderItem={item => {
          const added = item[1];
          const isCurrentWallet = item[0] === address;
          if (added) {
            return (
              <List.Item key={"owner_" + item[0]}>
                {isCurrentWallet ? (
                  <h1>Current wallet</h1>
                ) : (
                  <Address
                    address={item[0]}
                    ensProvider={mainnetProvider}
                    blockExplorer={blockExplorer}
                    fontSize={32}
                  />
                )}
                <div style={{ padding: 16 }}>{owners[item.owner] || isCurrentWallet ? "🌐" : "🚫"}</div>
              </List.Item>
            );
          }
        }}
      />
    </div>
  );
}
