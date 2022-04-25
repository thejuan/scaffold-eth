// SPDX-License-Identifier: MIT

//  Off-chain signature gathering multisig that streams funds - @austingriffith
//
// started from 🏗 scaffold-eth - meta-multi-sig-wallet example https://github.com/austintgriffith/scaffold-eth/tree/meta-multi-sig
//    (off-chain signature based multi-sig)
//  added a very simple streaming mechanism where `onlySelf` can open a withdraw-based stream
//

pragma solidity >=0.8.0 <0.9.0;
// Not needed to be explicitly imported in Solidity 0.8.x
// pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "hardhat/console.sol";

contract MetaMultiSigWallet is EIP712 {
    using ECDSA for bytes32;

    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event ExecuteTransaction(
        address indexed owner,
        address payable to,
        uint256 value,
        bytes data,
        uint256 deadline,
        bytes32 hash,
        bytes result
    );
    event Owner(address indexed owner, bool added);
    mapping(address => bool) public isOwner;
    uint256 public signaturesRequired;
    mapping(bytes32 => bool) executedTransactions;
    uint256 public chainId;

    constructor(
        uint256 _chainId,
        address[] memory _owners,
        uint256 _signaturesRequired
    ) EIP712("Adams Speedrun", "v1") {
        require(
            _signaturesRequired > 0,
            "constructor: must be non-zero sigs required"
        );
        signaturesRequired = _signaturesRequired;
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "constructor: zero address");
            require(!isOwner[owner], "constructor: owner not unique");
            isOwner[owner] = true;
            emit Owner(owner, isOwner[owner]);
        }
        chainId = _chainId;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "Not Self");
        _;
    }

    function addSigner(address newSigner, uint256 newSignaturesRequired)
        public
        onlySelf
    {
        require(newSigner != address(0), "addSigner: zero address");
        require(!isOwner[newSigner], "addSigner: owner not unique");
        require(
            newSignaturesRequired > 0,
            "addSigner: must be non-zero sigs required"
        );
        isOwner[newSigner] = true;
        signaturesRequired = newSignaturesRequired;
        emit Owner(newSigner, isOwner[newSigner]);
    }

    function removeSigner(address oldSigner, uint256 newSignaturesRequired)
        public
        onlySelf
    {
        require(isOwner[oldSigner], "removeSigner: not owner");
        require(
            newSignaturesRequired > 0,
            "removeSigner: must be non-zero sigs required"
        );
        isOwner[oldSigner] = false;
        signaturesRequired = newSignaturesRequired;
        emit Owner(oldSigner, isOwner[oldSigner]);
    }

    function updateSignaturesRequired(uint256 newSignaturesRequired)
        public
        onlySelf
    {
        require(
            newSignaturesRequired > 0,
            "updateSignaturesRequired: must be non-zero sigs required"
        );
        signaturesRequired = newSignaturesRequired;
    }

    function getTransactionHash(
        uint256 deadline,
        address to,
        uint256 value,
        bytes memory data
    ) public view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(abi.encode(this.chainId, to, value, deadline, data))
            );
    }

    function executeTransaction(
        address payable to,
        uint256 value,
        uint256 deadline,
        bytes memory data,
        bytes[] memory signatures
    ) public returns (bytes memory) {
        require(
            isOwner[msg.sender],
            "executeTransaction: only owners can execute"
        );
        bytes32 _hash = this.getTransactionHash(deadline, to, value, data);
        require(
            !executedTransactions[_hash],
            "executeTransaction: replay detected"
        );
        uint256 validSignatures;
        address duplicateGuard;
        for (uint256 i = 0; i < signatures.length; i++) {
            address recovered = recover(_hash, signatures[i]);
            require(
                recovered > duplicateGuard,
                "executeTransaction: duplicate or unordered signatures"
            );
            duplicateGuard = recovered;
            if (isOwner[recovered]) {
                validSignatures++;
            }
        }

        require(
            validSignatures >= signaturesRequired,
            "executeTransaction: not enough valid signatures"
        );
        (bool success, bytes memory result) = to.call{value: value}("");
        require(success, "executeTransaction: tx failed");
        executedTransactions[_hash] = true;
        emit ExecuteTransaction(
            msg.sender,
            to,
            value,
            data,
            deadline,
            _hash,
            result
        );
        return result;
    }

    function recover(bytes32 _hash, bytes memory _signature)
        public
        pure
        returns (address)
    {
        return _hash.toEthSignedMessageHash().recover(_signature);
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
}
