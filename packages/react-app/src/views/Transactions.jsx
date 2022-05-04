import React, { useEffect, useState } from "react";
import { Button, List, Spin } from "antd";
import { parseEther } from "@ethersproject/units";
import { ethers } from "ethers";
import { TransactionListItem } from "../components";
import { useTransactions } from "../context";

const filterInvalidTransactions = async ({ txs, contract }) => {
  const newTransactions = [];
  for (const trans of txs) {
    if (trans.deadline < new Date().getTime()) {
      console.log(`Transaction expired {${trans.deadline} < ${new Date().getTime()}}`, trans);
      continue;
    }

    const validSignatures = [];
    for (const s of Object.values(trans.signatures)) {
      const signer = await contract.recover(trans.hash, s.signature);
      const isOwner = await contract.isOwner(signer);
      if (signer && isOwner) {
        validSignatures.push({ signer, signature: s.signature });
      } else {
        console.warn(`Removed invalid transaction`, trans);
      }
    }
    const update = { ...trans, validSignatures };
    newTransactions.push(update);
  }
  return newTransactions;
};

export default function Transactions({
  contractName,
  signaturesRequired,
  address,
  abiDecoder,
  userProvider,
  mainnetProvider,
  price,
  tx,
  readContracts,
  writeContracts,
  blockExplorer,
}) {
  const contract = readContracts[contractName];
  const { transactions, setTransactions } = useTransactions();
  const [validTxs, setValidTxns] = useState(Object.values(transactions));
  useEffect(() => {
    filterInvalidTransactions({ txs: Object.values(transactions), contract })
      .then(t => setValidTxns(t))
      .catch(console.error);
  }, [transactions, contract]);

  const getSortedSigList = async (allSigs, newHash) => {
    console.log("allSigs", allSigs);

    const sigList = [];
    for (const s in allSigs) {
      console.log("SIG", allSigs[s]);
      const recover = await readContracts[contractName].recover(newHash, allSigs[s]);
      sigList.push({ signature: allSigs[s], signer: recover });
    }

    sigList.sort((a, b) => {
      return ethers.BigNumber.from(a.signer).sub(ethers.BigNumber.from(b.signer));
    });

    console.log("SORTED SIG LIST:", sigList);

    const finalSigList = [];
    const finalSigners = [];
    const used = {};
    for (const s in sigList) {
      if (!used[sigList[s].signature]) {
        finalSigList.push(sigList[s].signature);
        finalSigners.push(sigList[s].signer);
      }
      used[sigList[s].signature] = true;
    }

    console.log("FINAL SIG LIST:", finalSigList);
    return [finalSigList, finalSigners];
  };

  if (!signaturesRequired) {
    return <Spin />;
  }

  console.log("transactions", validTxs);

  return (
    <div style={{ maxWidth: 750, margin: "auto", marginTop: 32, marginBottom: 32 }}>
      <List
        bordered
        dataSource={validTxs}
        renderItem={item => {
          const signatures = Object.values(item.signatures).map(s => s.signature);
          const hasSigned = item.signatures[address];
          const hasEnoughSignatures = signatures.length >= signaturesRequired.toNumber();

          return (
            <TransactionListItem
              item={item}
              abiDecoder={abiDecoder}
              mainnetProvider={mainnetProvider}
              blockExplorer={blockExplorer}
              price={price}
              readContracts={readContracts}
              contractName={contractName}
            >
              <span>
                {signatures.length}/{signaturesRequired.toNumber()} {hasSigned ? "✅" : ""}
              </span>
              <Button
                onClick={async () => {
                  const newHash = await readContracts[contractName].getTransactionHash(
                    item.deadline,
                    item.to,
                    parseEther("" + parseFloat(item.amount).toFixed(12)),
                    item.data,
                  );
                  console.log("newHash", newHash);

                  const signature = await userProvider.send("personal_sign", [newHash, address]);
                  console.log("signature", signature);

                  const recover = await readContracts[contractName].recover(newHash, signature);
                  console.log("recover--->", recover);

                  const isOwner = await readContracts[contractName].isOwner(recover);
                  console.log("isOwner", isOwner);

                  if (isOwner) {
                    item.signatures[recover] = { signer: recover, signature };
                    setTransactions({ ...transactions, [item.hash]: item });
                  }
                }}
                type="secondary"
              >
                Sign
              </Button>
              <Button
                key={item.hash}
                onClick={async () => {
                  const newHash = await readContracts[contractName].getTransactionHash(
                    item.deadline,
                    item.to,
                    parseEther("" + parseFloat(item.amount).toFixed(12)),
                    item.data,
                  );
                  console.log("newHash", newHash);

                  console.log("item.signatures", signatures);

                  const [finalSigList] = await getSortedSigList(signatures, newHash);

                  const result = await tx(
                    writeContracts[contractName].executeTransaction(
                      item.to,
                      parseEther("" + parseFloat(item.amount).toFixed(12)),
                      item.deadline,
                      item.data,
                      finalSigList,
                    ),
                  );
                  console.log("TX Result", result);
                  delete transactions[item.hash];
                  setTransactions(transactions);
                }}
                type={hasEnoughSignatures ? "primary" : "secondary"}
              >
                Exec
              </Button>
            </TransactionListItem>
          );
        }}
      />
    </div>
  );
}
