import React, { useEffect, useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import { Button, Select, Input, Spin } from "antd";
import { parseEther } from "@ethersproject/units";
import { Address, AddressInput, Balance, EtherInput, Blockie } from "../components";
import { useTransactions } from "../context";
const { Option } = Select;

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

  const calldataInputRef = useRef("0x");

  console.log("price", price);

  const [to, setTo] = useLocalStorage("to");
  const [amount, setAmount] = useLocalStorage("amount", "0");
  const [data, setData] = useLocalStorage("data", "0x");
  const [isCreateTxnEnabled, setCreateTxnEnabled] = useState(true);
  const [decodedDataState, setDecodedData] = useState();
  const [methodName, setMethodName] = useState();
  const [selectDisabled, setSelectDisabled] = useState(false);
  let decodedData = "";

  const [result, setResult] = useState();

  const inputStyle = {
    padding: 10,
  };
  let decodedDataObject = "";
  useEffect(() => {
    const inputTimer = setTimeout(async () => {
      console.log("EFFECT RUNNING");
      try {
        // if(methodName == "transferFunds"){
        //   console.log("Send transaction selected")
        //   console.log("🔥🔥🔥🔥🔥🔥",amount)
        //     const calldata = readContracts[contractName].interface.encodeFunctionData("transferFunds",[to,parseEther("" + parseFloat(amount).toFixed(12))])
        //     setData(calldata);
        // }
        // decodedDataObject = readContracts ? await readContracts[contractName].interface.parseTransaction({ data }) : "";
        // console.log("decodedDataObject", decodedDataObject);
        // setCreateTxnEnabled(true);
        if (decodedDataObject.signature === "addSigner(address,uint256)") {
          setMethodName("addSigner");
          setSelectDisabled(true);
        } else if (decodedDataObject.signature === "removeSigner(address,uint256)") {
          setMethodName("removeSigner");
          setSelectDisabled(true);
        }
        decodedData = (
          <div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "left",
                marginTop: 16,
                marginBottom: 16,
              }}
            >
              {decodedDataObject && decodedDataObject.signature && <b>Function Signature : </b>}
              {decodedDataObject.signature}
            </div>
            {decodedDataObject.functionFragment &&
              decodedDataObject.functionFragment.inputs.map((element, index) => {
                if (element.type === "address") {
                  return (
                    <div
                      style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "left" }}
                    >
                      <b>{element.name} :&nbsp;</b>
                      <Address fontSize={16} address={decodedDataObject.args[index]} ensProvider={mainnetProvider} />
                    </div>
                  );
                }
                if (element.type === "uint256") {
                  return (
                    <p style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "left" }}>
                      {element.name === "value" ? (
                        <>
                          <b>{element.name} : </b>{" "}
                          <Balance fontSize={16} balance={decodedDataObject.args[index]} dollarMultiplier={price} />{" "}
                        </>
                      ) : (
                        <>
                          <b>{element.name} : </b>{" "}
                          {decodedDataObject.args[index] && decodedDataObject.args[index].toNumber()}
                        </>
                      )}
                    </p>
                  );
                }
              })}
          </div>
        );
        setDecodedData(decodedData);
        setCreateTxnEnabled(true);
        setResult();
      } catch (error) {
        console.log("mistake: ", error);
        if (data !== "0x") setResult("ERROR: Invalid calldata");
        setCreateTxnEnabled(false);
      }
    }, 500);
    return () => {
      clearTimeout(inputTimer);
    };
  }, [data, decodedData, amount]);

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
            <Select value={methodName} disabled={selectDisabled} style={{ width: "100%" }} onChange={setMethodName}>
              <Option key="transferFunds">transferFunds()</Option>
              <Option disabled={true} key="addSigner">
                addSigner()
              </Option>
              <Option disabled={true} key="removeSigner">
                removeSigner()
              </Option>
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

          {!selectDisabled && (
            <div style={inputStyle}>
              <EtherInput price={price} mode="USD" value={amount} onChange={setAmount} />
            </div>
          )}
          <div style={inputStyle}>
            <Input
              placeholder="calldata"
              value={data}
              onChange={e => {
                setData(e.target.value);
              }}
              ref={calldataInputRef}
            />
            {decodedDataState}
          </div>

          <Button
            style={{ marginTop: 32 }}
            disabled={!isCreateTxnEnabled}
            onClick={async () => {
              //TODO: deadline picker
              const deadline = new Date().getTime() + 10000000;
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

function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = value => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
