export class LocalStorageTransactionService {
  log;
  contractId;

  constructor(address, todo, log) {
    this.log = log;
    const chainId = "31337"; //todo
    this.contractId = `tx-list-${address}_${chainId}`;
  }

  async list() {
    this.log("🛰 Requesting Transaction List " + this.contractId);
    return Object.values(this.#getTransactions());
  }

  #getTransactions() {
    if (!localStorage.getItem(this.contractId)) {
      localStorage.setItem(this.contractId, JSON.stringify({}));
    }
    const value = localStorage.getItem(this.contractId);
    return JSON.parse(value);
  }

  async add(signedTransaction) {
    this.log("🛰 Adding Transaction to " + this.contractId);
    const transactions = this.#getTransactions();
    if (transactions[signedTransaction.hash]) {
      this.log(`Adding signers to existing transaction`);
      const tx = transactions[signedTransaction.hash];
      tx.signatures = { ...signedTransaction.signatures, ...tx.signatures };
    } else {
      this.log(`Adding new transaction`);
      transactions[signedTransaction.hash] = signedTransaction;
    }
    localStorage.setItem(this.contractId, JSON.stringify(transactions));
    return signedTransaction;
  }

  async remove(hash) {
    this.log("🛰 Removing Transaction from " + this.contractId);
    const transactions = this.#getTransactions();
    delete transactions[hash];
    localStorage.setItem(this.contractId, JSON.stringify(transactions));
  }
}
