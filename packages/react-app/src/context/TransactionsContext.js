import { useEffect, createContext, useContext } from "react";
import { mapOwnerEventsToCurrentOwners, useP2P, useReceivePeerState, usePeerState } from "../hooks";
export const TransactionContext = createContext();

export const TransactionsProvider = ({ address, contractAddress, ownerEvents, children }) => {
  const storageKey = `txns-${contractAddress}`;
  const peerIds = mapOwnerEventsToCurrentOwners(ownerEvents, address).map(
    ownerAddress => `${contractAddress}-${ownerAddress}`,
  );
  const client = useP2P({ contractAddress, address });
  const [peerState, isConnected] = useReceivePeerState({ peerBrokerIds: peerIds, client });
  const [state, setState, connections] = usePeerState({
    initialState: JSON.parse(localStorage.getItem(storageKey) || "{}"),
    client,
  });

  const setTransactions = txs => {
    setState(txs);
    localStorage.setItem(storageKey, JSON.stringify(txs));
  };

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
      console.log(`P2P: State updated from peer`, state);
      setTransactions(state);
    }
  }, [JSON.stringify(peerState), JSON.stringify(state)]);

  const value = {
    owners: Object.fromEntries(
      peerIds.map(id => {
        return [id.split("-")[1], Boolean(isConnected?.[id] || connections.find(c => c.peer === id))];
      }),
    ),
    transactions: state,
    setTransactions,
  };

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
};
export const useTransactions = () => useContext(TransactionContext);
