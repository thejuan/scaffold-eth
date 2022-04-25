import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Select, Button, List, Divider, Input, Card, DatePicker, Slider, Switch, Progress, Spin } from "antd";
import { Address, AddressInput, Balance, Blockie } from "../components";
import { useLocalStorage } from "../hooks";
import Peer from "peerjs";
const { Option } = Select;

export default function Owners({
  contractName,
  ownerEvents,
  signaturesRequired,
  mainnetProvider,
  readContracts,
  blockExplorer,
  address,
}) {
  const history = useHistory();
  const contractAddress = readContracts[contractName].address;
  const [p2p, setP2P] = useState();
  const isOpen = p2p && p2p.open;
  useEffect(() => {
    if (address) {
      const peerId = `${contractAddress}-${address}`;
      console.log(`P2P: Connecting as ${peerId}`);
      const peer = new Peer(peerId);
      setP2P(peer);
      peer.on("open", () => {
        console.log("P2P: Connected", peer);
      });
      peer.on("error", err => {
        console.error("P2P: Error", err);
      });
      peer.on("disconnected", () => {
        console.warn("P2P: Disconnected");
      });
      peer.on("connection", conn => {
        console.log(`P2P: Connection from`, conn);
      });
    }
  }, [contractAddress, address]);

  useEffect(() => {
    if (p2p && isOpen) {
      //TODO: filter owners who are still owners
      for (const ownerEvent of ownerEvents) {
        const ownerAddress = ownerEvent[0];
        if (ownerAddress === address || !ownerAddress) continue;
        const ownerPeerId = `${contractAddress}-${ownerAddress}`;
        console.log(`P2P: Connectig to ${ownerPeerId}`);
        const conn = p2p.connect(ownerPeerId);
        if (conn) {
          console.log(`P2P: Setting up listeners for ${ownerPeerId}`);
          conn.on("open", () => {
            console.log(`P2P:Connected to ${ownerPeerId}`);
          });
          conn.on("close", () => {
            console.log(`P2P:Connected to ${ownerPeerId} closed`);
          });
          conn.on("error", err => {
            console.error(`P2P:Connection with ${ownerPeerId} error`, err);
          });
        }
      }
    }
  }, [p2p, ownerEvents, contractAddress, address, isOpen]);

  const [to, setTo] = useLocalStorage("to");
  const [amount, setAmount] = useLocalStorage("amount", "0");
  const [methodName, setMethodName] = useLocalStorage("addSigner");
  const [newOwner, setNewOwner] = useLocalStorage("newOwner");
  const [newSignaturesRequired, setNewSignaturesRequired] = useLocalStorage("newSignaturesRequired");
  const [data, setData] = useLocalStorage("data", "0x");

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
          if (added) {
            return (
              <List.Item key={"owner_" + item[0]}>
                {item[0] === address ? (
                  <h1>Your wallet</h1>
                ) : (
                  <Address
                    address={item[0]}
                    ensProvider={mainnetProvider}
                    blockExplorer={blockExplorer}
                    fontSize={32}
                  />
                )}
                <div style={{ padding: 16 }}>
                  {item[0] === address || p2p?.connections[`${contractAddress}-${item[0]}`]?.find(c => c.open)
                    ? "🌐"
                    : "🚫"}
                </div>
              </List.Item>
            );
          }
        }}
      />

      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        <div style={{ margin: 8, padding: 8 }}>
          <Select value={methodName} style={{ width: "100%" }} onChange={setMethodName}>
            <Option key="addSigner">addSigner()</Option>
            <Option key="removeSigner">removeSigner()</Option>
          </Select>
        </div>
        <div style={{ margin: 8, padding: 8 }}>
          <AddressInput
            autoFocus
            ensProvider={mainnetProvider}
            placeholder="new owner address"
            value={newOwner}
            onChange={setNewOwner}
          />
        </div>
        <div style={{ margin: 8, padding: 8 }}>
          <Input
            ensProvider={mainnetProvider}
            placeholder="new # of signatures required"
            value={newSignaturesRequired}
            onChange={e => {
              setNewSignaturesRequired(e.target.value);
            }}
          />
        </div>
        <div style={{ margin: 8, padding: 8 }}>
          <Button
            onClick={() => {
              console.log("METHOD", setMethodName);
              let calldata = readContracts[contractName].interface.encodeFunctionData(methodName, [
                newOwner,
                newSignaturesRequired,
              ]);
              console.log("calldata", calldata);
              setData(calldata);
              setAmount("0");
              setTo(readContracts[contractName].address);
              setTimeout(() => {
                history.push("/create");
              }, 777);
            }}
          >
            Create Tx
          </Button>
        </div>
      </div>
    </div>
  );
}
