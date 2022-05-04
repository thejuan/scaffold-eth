import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Button, Select, Input, Spin, DatePicker } from "antd";
import { parseEther } from "@ethersproject/units";
import { AddressInput, EtherInput, Blockie } from "../components";
import { useTransactions } from "../context";
import moment from "moment";
import Web3 from "web3";
const { Option } = Select;

const web3 = new Web3(Web3.givenProvider);

export default function CreateTransaction({
  poolServerUrl,
  contractName,
  address,
  userProvider,
  mainnetProvider,
  localProvider,
  price,
  readContracts,
}) {
  const history = useHistory();
  const { transactions, setTransactions } = useTransactions();

  console.log("price", price);

  const [to, setTo] = useState();
  const [amount, setAmount] = useState(0);
  const [deadline, setDeadline] = useState();
  const [data, setData] = useState("0x");
  const [isCreateTxnEnabled, setCreateTxnEnabled] = useState(false);
  const [methodName, setMethodName] = useState();
  const [signaturesRequired, setSignaturesRequired] = useState();

  const [result, setResult] = useState();

  const inputStyle = {
    padding: 10,
  };
  useEffect(() => {
    if (methodName === "transferFunds") {
      if (to && amount && deadline) {
        setData("0x");
        setCreateTxnEnabled(true);
      }
    } else if (methodName) {
      setAmount(0);
      if (to && deadline && signaturesRequired) {
        const fnSignature = web3.utils.keccak256(`${methodName}(address,uint256)`).substr(0, 10);
        const fnParams = web3.eth.abi.encodeParameters(["address", "uint256"], [to, signaturesRequired]);
        setData(fnSignature + fnParams.substr(2));
        setCreateTxnEnabled(true);
      }
    } else {
      setCreateTxnEnabled(false);
    }
  }, [to, amount, deadline, methodName, setData, signaturesRequired]);

  let resultDisplay;
  if (result) {
    if (result.indexOf("ERROR") >= 0) {
      resultDisplay = <div style={{ margin: 16, padding: 8, color: "red" }}>{result}</div>;
    } else {
      resultDisplay = (
        <div style={{ margin: 16, padding: 8 }}>
          <Blockie size={4} scale={8} address={result} /> Tx {result.substr(0, 6)} Created!
          <div style={{ margin: 8, padding: 4 }}>
            <Spin />
          </div>
        </div>
      );
    }
  }

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 400, margin: "auto", marginTop: 64 }}>
        <div style={{ margin: 8 }}>
          <div style={{ margin: 8, padding: 8 }}>
            <Select value={methodName} style={{ width: "100%" }} onChange={setMethodName}>
              <Option key="transferFunds">transferFunds()</Option>
              <Option key="addSigner">addSigner()</Option>
              <Option key="removeSigner">removeSigner()</Option>
            </Select>
          </div>
          <div style={inputStyle}>
            <AddressInput
              autoFocus
              ensProvider={mainnetProvider}
              placeholder="to address"
              value={to}
              onChange={setTo}
            />
          </div>
          <div style={inputStyle}>
            <DatePicker
              placeholder="Tx Expires At"
              showTime
              defaultValue={deadline ? moment(deadline) : deadline}
              onChange={d => setDeadline(d.valueOf())}
            />
          </div>
          {methodName === "transferFunds" && (
            <div style={inputStyle}>
              <EtherInput price={price} mode="USD" value={amount} onChange={setAmount} />
            </div>
          )}

          {methodName && methodName !== "transferFunds" && (
            <div style={inputStyle}>
              <label for="signaturesRequired">Signatures Required:</label>{" "}
              <Input
                name="signaturesRequired"
                value={signaturesRequired}
                onChange={e => setSignaturesRequired(+e.target.value)}
              />
            </div>
          )}
          <div style={inputStyle}>
            Calldata:
            <Input value={data} readonly />
          </div>
          <Button
            style={{ marginTop: 32 }}
            disabled={!isCreateTxnEnabled}
            onClick={async () => {
              //todo make creation dialog for each of the other transaction types and ecnode call data
              const parsedAmount = parseEther("" + parseFloat(amount).toFixed(12));
              const formattedData = data || "0x";
              const newHash = await readContracts[contractName].getTransactionHash(
                deadline,
                to,
                parsedAmount,
                formattedData,
              );
              console.log("newHash", newHash);

              const signature = await userProvider.send("personal_sign", [newHash, address]);
              console.log("signature", signature);

              const recover = await readContracts[contractName].recover(newHash, signature);
              console.log("recover", recover);

              const isOwner = await readContracts[contractName].isOwner(recover);
              console.log("isOwner", isOwner);

              if (isOwner) {
                const added = {
                  chainId: localProvider._network.chainId,
                  address: readContracts[contractName].address,
                  deadline,
                  to,
                  amount,
                  data: formattedData,
                  hash: newHash,
                  signatures: { [recover]: { signer: recover, signature } },
                };
                console.log(`Adding new transaction`, added);
                setTransactions({
                  ...transactions,
                  [newHash]: added,
                });
                // IF SIG IS VALUE ETC END TO SERVER AND SERVER VERIFIES SIG IS RIGHT AND IS SIGNER BEFORE ADDING TY
                setTimeout(() => {
                  history.push("/pool");
                }, 2777);

                setResult(added.hash);
                setTo();
                setAmount("0");
                setData("0x");
              } else {
                console.log("ERROR, NOT OWNER.");
                setResult("ERROR, NOT OWNER.");
              }
            }}
          >
            Create
          </Button>
        </div>

        {resultDisplay}
      </div>
    </div>
  );
}
