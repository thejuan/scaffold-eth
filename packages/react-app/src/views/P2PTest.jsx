import { useTransactions } from "../hooks";

export default function P2PTest({ contractAddress, ownerEvents, address }) {
  const { owners, transactions, setTransactions } = useTransactions({
    contractAddress,
    ownerEvents,
    address,
  });
  return (
    <div>
      <h1>connections</h1>
      {Object.entries(owners).map(([address, isConnected]) => (
        <div>
          {address}:{isConnected ? "connected" : "not connected"}
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
