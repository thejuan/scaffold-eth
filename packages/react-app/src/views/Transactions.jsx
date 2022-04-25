import React, { useState } from "react";
import { Button, List, Spin } from "antd";
import { parseEther } from "@ethersproject/units";
import { ethers } from "ethers";
import { TransactionListItem } from "../components";
import { usePoller } from "../hooks";
import { LocalStorageTransactionService } from "../services/transaction/TransactionService";

export default function Transactions({
  contractName,
  signaturesRequired,
  address,
  nonce,
  userProvider,
  mainnetProvider,
  price,
  tx,
  readContracts,
  writeContracts,
  blockExplorer,
}) {
  const txService = new LocalStorageTransactionService(
    readContracts[contractName].address,
    readContracts[contractName].chainId,
    console.log,
  );
  const [transactions, setTransactions] = useState();

  //move to transactions hook
  usePoller(() => {
    const getTransactions = async () => {
      if (true) console.log("🛰 Requesting Transaction List");
      const txs = await txService.list();
      const newTransactions = [];
      for (const trans of txs) {
        if (trans.deadline < new Date().getTime()) {
          console.log(`Transaction expired {${trans.deadline} < ${new Date().getTime()}}`, trans);
          continue;
        }

        const validSignatures = [];
        for (const s of Object.values(trans.signatures)) {
          const signer = await readContracts[contractName].recover(trans.hash, s.signature);
          const isOwner = await readContracts[contractName].isOwner(signer);
          if (signer && isOwner) {
            validSignatures.push({ signer, signature: s.signature });
          }
        }
        const update = { ...trans, validSignatures };
        // console.log("update",update)
        newTransactions.push(update);
      }
      setTransactions(newTransactions);
      console.log("Loaded", newTransactions.length);
    };
    if (readContracts) getTransactions();
  }, 3777);

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

  console.log("transactions", transactions);

  return (
    <div style={{ maxWidth: 750, margin: "auto", marginTop: 32, marginBottom: 32 }}>
      <h1>
        <b style={{ padding: 16 }}>#{nonce ? nonce.toNumber() : <Spin />}</b>
      </h1>

      <List
        bordered
        dataSource={transactions}
        renderItem={item => {
          console.log("ITE88888M", item);

          const signatures = Object.values(item.signatures).map(s => s.signature);
          const hasSigned = item.signatures[address];
          const hasEnoughSignatures = signatures.length >= signaturesRequired.toNumber();

          return (
            <TransactionListItem
              item={item}
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
                    await txService.add(item);
                  }

                  // tx( writeContracts[contractName].executeTransaction(item.to,parseEther(""+parseFloat(item.amount).toFixed(12)), item.data, item.signatures))
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

                  await tx(
                    writeContracts[contractName].executeTransaction(
                      item.to,
                      parseEther("" + parseFloat(item.amount).toFixed(12)),
                      item.deadline,
                      item.data,
                      finalSigList,
                    ),
                  );

                  txService.remove(item.hash);
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
