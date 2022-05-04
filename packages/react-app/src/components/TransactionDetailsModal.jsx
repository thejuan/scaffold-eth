import React from "react";
import { Modal } from "antd";
import Address from "./Address";
import Balance from "./Balance";
const TransactionDetailsModal = function ({ visible, handleOk, mainnetProvider, price, txnInfo = null }) {
  return (
    <Modal
      title="Transaction Details"
      visible={visible}
      onCancel={handleOk}
      destroyOnClose
      onOk={handleOk}
      footer={null}
      closable
      maskClosable
    >
      {txnInfo && (
        <div>
          <p>
            <b>Event Name :</b> {txnInfo.name}
          </p>
          <h4>Arguments :&nbsp;</h4>
          {txnInfo.params?.map((element, index) => {
            if (element.type === "address") {
              return (
                <div
                  key={element.name}
                  style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "left" }}
                >
                  <b>{element.name} :&nbsp;</b>
                  <Address fontSize={16} address={element.value} ensProvider={mainnetProvider} />
                </div>
              );
            }
            if (element.type === "uint256") {
              return (
                <p key={element.name}>
                  {element.name === "value" ? (
                    <>
                      <b>{element.name} : </b>{" "}
                      <Balance fontSize={16} balance={element.value} dollarMultiplier={price} />{" "}
                    </>
                  ) : (
                    <>
                      <b>{element.name} : </b> {element.value}
                    </>
                  )}
                </p>
              );
            }
          })}
          <p>
            <b>SigHash : &nbsp;</b>
            {txnInfo.sighash}
          </p>
          {txnInfo.succeeded !== undefined && (
            <p>
              <b>Succeeded : &nbsp;</b>
              {txnInfo.succeeded.toString()}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TransactionDetailsModal;
