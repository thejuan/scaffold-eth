import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Select, Button, List, Divider, Input, Card, DatePicker, Slider, Switch, Progress, Spin } from "antd";
import { Address, AddressInput, Balance, Blockie } from "../components";
import { useLocalStorage } from "../hooks";
const { Option } = Select;

/** 
export const useP2P = ({ walletAddress, contractAddress, ownersWalletAddresses }) => {
  
  const [peers, setPeers] = useState({});

  const findPeer = useCallback(ownerAddress => peers[`${contractAddress}-${ownerAddress}`], [peers, contractAddress]);
  const listPeers = useCallback(() => Object.values(peers), [peers]);
  const addPeer = useCallback(
    (ownerAddress, conn) => {
      setPeers({ ...peers, [`${contractAddress}-${ownerAddress}`]: conn });
    },
    [peers, contractAddress],
  );
  const removePeer = useCallback(
    ownerAddress => {
      const p = { ...peers };
      delete p[`${contractAddress}-${ownerAddress}`];
      setPeers(p);
    },
    [peers, contractAddress],
  );

  const connect = useCallback(
    ownerAddress => {
      const conn = client.connect(`${contractAddress}-${ownerAddress}`);
      if (conn) {
        console.log(`P2P: Setting up listeners for ${ownerAddress}`);
        conn.on("open", () => {
          console.log(`P2P:Connected to ${ownerAddress}`);
          addPeer(ownerAddress, conn);
        });
        conn.on("close", () => {
          console.log(`P2P: Connected to ${ownerAddress} closed`);
          removePeer(ownerAddress);
        });
        conn.on("error", err => {
          console.error(`P2P:Connection with ${ownerAddress} error`, err);
        });
      }
    },
    [client, addPeer, removePeer, contractAddress],
  );
  

  return {
    client,
    peers: useMemo(
      () => ({ listPeers, connect, findPeer, addPeer, removePeer }),
      [listPeers, connect, findPeer, addPeer, removePeer],
    ),
  };
};

const useConnectWithOwners = ({ peers, ownerAddresses }) => {
  useEffect(() => {
    if (peers) {
      for (const ownerAddress of ownerAddresses) {
        const ownerPeerId = ownerAddress;
        if (!peers.findPeer(ownerAddress)) {
          console.log(`P2P: Connecting to ${ownerPeerId}`);
          peers.connect(ownerPeerId);
        }
      }
    }
  }, [peers, ownerAddresses]);
};

*/

const mapOwnerEventsToCurrentOwners = ownerEvents => {
  return Object.keys(
    ownerEvents.reduce((owners, e) => {
      if (e.added) {
        owners[e.owner] = e;
      } else {
        delete owners[e.owner];
      }
      return owners;
    }, {}),
  );
};

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
                {/**  <div style={{ padding: 16 }}>{item[0] === address || peer?.open ? "🌐" : "🚫"}</div> */}
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
