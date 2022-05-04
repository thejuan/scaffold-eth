import React, { useState } from "react";
import { Button, List } from "antd";

import { Address, Balance, Blockie, TransactionDetailsModal } from "../components";
import { EllipsisOutlined } from "@ant-design/icons";
import { parseEther, formatEther } from "@ethersproject/units";

const TransactionListItem = function ({ item, mainnetProvider, abiDecoder, blockExplorer, price, children }) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  console.log("🔥🔥🔥🔥", item);
  let txnData;
  try {
    if (abiDecoder) {
      if (item.data && item.data !== "0x") {
        txnData = abiDecoder.decodeMethod(item.data) || {};
        txnData.sighash = item.hash;
        txnData.succeeded = item.succeeded;
      }
    }
    if (item.data === "0x") {
      txnData = {
        name: "transferFunds",
        sighash: item.hash,
        succeeded: item.succeeded,
        params: [{ name: "to", value: item.to, type: "address" }],
      };
    }
  } catch (error) {
    console.log("ERROR", error);
  }
  return (
    <>
      <TransactionDetailsModal
        visible={isModalVisible}
        txnInfo={txnData}
        handleOk={handleOk}
        mainnetProvider={mainnetProvider}
        price={price}
      />
      {txnData && (
        <List.Item key={item.hash} style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 55,
              fontSize: 12,
              opacity: 0.5,
              display: "flex",
              flexDirection: "row",
              width: "90%",
              justifyContent: "space-between",
            }}
          >
            <p>
              <b>Event Name :&nbsp;</b>
              {txnData.name}&nbsp;
            </p>
          </div>
          <span>
            {item.succeeded === false ? "❌" : undefined}
            {item.succeeded === true ? "👍" : undefined}
          </span>
          <span>
            <Blockie size={4} scale={8} address={item.hash} /> {item.hash.substr(0, 6)}
          </span>
          <Address address={item.to} ensProvider={mainnetProvider} blockExplorer={blockExplorer} fontSize={16} />
          <Balance
            balance={item.value ? item.value : parseEther("" + parseFloat(item.amount).toFixed(12))}
            dollarMultiplier={price}
          />
          <>{children}</>
          <Button onClick={showModal}>
            <EllipsisOutlined />
          </Button>
        </List.Item>
      )}
    </>
  );
};
export default TransactionListItem;
