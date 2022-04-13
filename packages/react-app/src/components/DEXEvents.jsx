import Events from "./Events";
export default function DEXEvents({ readContracts, localProvider, mainnetProvider }) {
  return (
    <>
      <Events
        contracts={readContracts}
        contractName="DEX"
        eventName="EthToTokenSwap"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />
      <Events
        contracts={readContracts}
        contractName="DEX"
        eventName="TokenToEthSwap"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />
      <Events
        contracts={readContracts}
        contractName="DEX"
        eventName="LiquidityProvided"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />
      <Events
        contracts={readContracts}
        contractName="DEX"
        eventName="SetPurpose"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />
      <Events
        contracts={readContracts}
        contractName="DEX"
        eventName="LiquidityRemoved"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />
    </>
  );
}
