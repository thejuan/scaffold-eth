import React, { useEffect, useState, useRef } from "react";
import Peer from "peerjs";
//inspo from https://github.com/madou/react-peer

const mapOwnerEventsToCurrentOwners = (ownerEvents, currentAddress) => {
  return Object.keys(
    ownerEvents.reduce((owners, e) => {
      if (e.added) {
        owners[e.owner] = e;
      } else {
        delete owners[e.owner];
      }
      return owners;
    }, {}),
  ).filter(o => o !== currentAddress);
};

const useReceivePeerState = ({ peerBrokerIds, client }) => {
  const [state, setState] = useState();
  const [isConnected, setIsConnected] = useState({});

  useEffect(() => {
    if (!peerBrokerIds?.length) {
      return;
    }

    if (!client) {
      return;
    }

    console.log(`P2P: Connecting to peers: ${peerBrokerIds}`);

    for (const id of peerBrokerIds) {
      console.log(`P2P: Connecting to peer: ${id}`);
      const connection = client.connect(id);

      connection.on("open", () => {
        console.log(`P2P: Connected to ${id}`);
        connection.on("data", receivedData => {
          console.log(`P2P: Received data from ${id}`, receivedData);
          setState(prevState => ({ ...prevState, [id]: receivedData }));
          setIsConnected(prevState => ({ ...prevState, [id]: true }));
        });
      });

      // connection.on("close", () => {
      //   console.log(`P2P: Connection to ${id} closed`);
      //   setIsConnected(prevState => ({ ...prevState, [id]: false }));
      // });

      connection.on("error", err => console.error(`P2P: Error from ${id}`, err));
    }

    // return () => {
    //   setIsConnected({});
    // };
  }, [JSON.stringify(peerBrokerIds), client]);

  return [state, isConnected];
};

const usePeerState = ({ initialState, client }) => {
  const [connections, setConnections] = useState([]);
  const [state, setState] = useState(initialState);
  // We useRef to get around useLayoutEffect's closure only having access
  // to the initial state since we only re-execute it if brokerId changes.
  const stateRef = useRef(initialState);

  useEffect(() => {
    if (!client) {
      return;
    }
    client.on("error", err => console.log(`P2P: Error`, err));

    client.on("connection", conn => {
      setConnections(prevState => [...prevState, conn]);

      // We want to immediately send the newly connected peer the current data.
      conn.on("open", () => {
        console.log(`P2P: Connection from ${conn.peer}, sending state`);
        conn.send(stateRef.current);
      });
    });
  }, [client]);

  return [
    state,
    newState => {
      setState(newState);
      stateRef.current = newState;
      connections.forEach(conn => conn.send(newState));
    },
    connections,
  ];
};

const useP2P = ({ contractAddress, address }) => {
  const [peer, setPeer] = useState(undefined);
  useEffect(() => {
    if (contractAddress && address) {
      const brokerId = `${contractAddress}-${address}`;
      console.log(`P2P: Connecting as ${brokerId}`);

      const localPeer = new Peer(brokerId);
      localPeer.on("error", err => console.error(`P2P: Error`, err));
      localPeer.on("open", () => {
        console.log(`P2P: Open`);
        setPeer(localPeer);
      });
      return () => {
        console.log(`P2P: Destroying`);
        localPeer?.destroy();
      };
    }
  }, [contractAddress, address]);

  return peer;
};

const useTransactions = ({ contractAddress, address, ownerEvents }) => {
  const peerIds = mapOwnerEventsToCurrentOwners(ownerEvents, address).map(
    ownerAddress => `${contractAddress}-${ownerAddress}`,
  );
  const client = useP2P({ contractAddress, address });
  const [peerState, isConnected] = useReceivePeerState({ peerBrokerIds: peerIds, client });
  const [state, setState] = usePeerState({ initialState: {}, client });

  useEffect(() => {
    if (!peerState) {
      return;
    }
    console.log(`P2P: Merging State`, [state, peerState]);
    // Naive sync merge
    // TODO: Checks here
    let changed = false;
    for (const peerTxs of Object.values(peerState)) {
      for (const [id, tx] of Object.entries(peerTxs)) {
        if (!state[id]) {
          state[id] = tx;
          changed = true;
        } else {
          for (const signature of Object.values(tx.signatures)) {
            if (!state[id].signatures[signature.signer]) {
              state[id].signatures[signature.signer] = signature;
              changed = true;
            }
          }
        }
      }
    }
    if (changed) {
      setState(state);
    }
  }, [JSON.stringify(peerState), JSON.stringify(state)]);

  return { isConnected, peerIds, transactions: state, setTransactions: setState };
};

export default function P2PTest({ contractAddress, ownerEvents, address }) {
  const { isConnected, peerIds, transactions, setTransactions } = useTransactions({
    contractAddress,
    ownerEvents,
    address,
  });
  return (
    <div>
      <h1>connections</h1>
      {peerIds.map(id => (
        <div>
          {id.split("-")[1]}:{isConnected[id] ? "connected" : "not connected"}
        </div>
      ))}

      <h1>remote state</h1>
      {Object.entries(transactions || {}).map(([key, value]) => (
        <div>
          {key.split("-")[1]}: {JSON.stringify(value || {})}
        </div>
      ))}
      <button
        onClick={() =>
          setTransactions({
            ...transactions,
            "0xf158afdb37a3808d8ad0061a3054900816acaa24932a5d563070f62534be4b94": {
              chainId: 31337,
              address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
              deadline: 1650808504683,
              to: "0x3cBdbb57A592E2Ac18947983928b99E5A35fFc58",
              amount: 0.004071191569919323,
              data: "0x",
              hash: "0xf158afdb37a3808d8ad0061a3054900816acaa24932a5d563070f62534be4b94",
              signatures: {
                "0x3cBdbb57A592E2Ac18947983928b99E5A35fFc58": {
                  signer: "0x3cBdbb57A592E2Ac18947983928b99E5A35fFc58",
                  signature:
                    "0x580b29c8ac4900dd58a71ab51082ce041050aba9909080c913b7e4b072cc20862fc03c0e5898c01026050127edfcac74bd5a8572ab54d29ed0512fd9eaadb7491b",
                },
              },
            },
          })
        }
      >
        Add Transaction
      </button>
      <button
        onClick={() =>
          setTransactions({
            ...transactions,
            "0xf158afdb37a3808d8ad0061a3054900816acaa24932a5d563070f62534be4b94": {
              chainId: 31337,
              address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
              deadline: 1650808504683,
              to: "0x3cBdbb57A592E2Ac18947983928b99E5A35fFc58",
              amount: 0.004071191569919323,
              data: "0x",
              hash: "0xf158afdb37a3808d8ad0061a3054900816acaa24932a5d563070f62534be4b94",
              signatures: {
                "0x3cBdbb57A592E2Ac18947983928b99E5A35fFc58": {
                  signer: "0x3cBdbb57A592E2Ac18947983928b99E5A35fFc58",
                  signature:
                    "0x580b29c8ac4900dd58a71ab51082ce041050aba9909080c913b7e4b072cc20862fc03c0e5898c01026050127edfcac74bd5a8572ab54d29ed0512fd9eaadb7491b",
                },
                "0x6D0a38c737fE39F9d91212Cf3B00251A653B1F66": {
                  signer: "0x6D0a38c737fE39F9d91212Cf3B00251A653B1F66",
                  signature:
                    "0xa3216daafde78e1b67e508c691ec3dd60a325c395d6f844ea3acda4a2c0946bb11465e0bc8102647299c7d0a4b58cc6d9d80fcb44c358ee6d7faf62be59f88971b",
                },
              },
            },
          })
        }
      >
        Add Signer
      </button>
    </div>
  );
}
