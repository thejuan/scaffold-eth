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

export const useTransactions = ({ contractAddress, address, ownerEvents }) => {
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
      // TODO: Validate state
      setState(state);
    }
  }, [JSON.stringify(peerState), JSON.stringify(state)]);

  return {
    owners: Object.fromEntries(
      peerIds.map(id => {
        return [id.split("-")[1], Boolean(isConnected?.[id])];
      }),
    ),
    transactions: state,
    setTransactions: setState,
  };
};
