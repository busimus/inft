import { Buffer } from "buffer";
import { INFT_CONTRACT } from "./config.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const State = Object.freeze({
  NotConn: 0,
  Connecting: 1,
  Connected: 3,
  Error: 4,
  WrongKey: 5,
});

export const APIKeyErrorCode = -32800;

export class Conn {
  constructor(connectedCb, rpcAddr = null, apiKey = null) {
    this.rpcAddr = rpcAddr;
    this.apiKey = apiKey;
    this.connectedCb = connectedCb;
    this.syncTicker = null;
    this.state = State.Connected;
    this.errorMessage = "";

    this.syncState = {
      syncing: false,
      currentBlock: 0,
      highestBlock: 0,
      wrongTime: false,
      peers: 5,
    };
  }

  async start() {
    this.state = State.Connecting;
    this.last_id = 0;
    try {
      await this.updateSyncState();
    } catch (e) {
      if (e.code === APIKeyErrorCode) {
        this.state = State.WrongKey;
        return;
      } else {
        this.state = State.Error;
        this.errorMessage = e.message;
        throw e;
      }
    }
    if (this.syncTicker !== null) {
      clearInterval(this.syncTicker);
    }
    // this.syncTicker = setInterval(() => this.updateSyncState(), 2500);
    this.state = State.Connected;
    this.connectedCb();
  }

  stop() {
    // if (this.syncTicker !== null) {
    //   clearInterval(this.syncTicker);
    //   this.syncTicker = null;
    // }
    this.state = State.NotConn;
  }

  //   async updateSyncState() {
  //     const sync = await this.call("bcn_syncing");
  //     Object.assign(this.syncState, sync);
  //     this.state = State.Connected;
  //   }

  async getIdentity(address) {
    return await this.call("dna_identity", [address]);
  }

  async getEpoch() {
    return await this.call("dna_epoch");
  }

  async getBalance(address) {
    return await this.call("dna_getBalance", [address]);
  }

  async getTxReceipt(txHash) {
    return await this.call("bcn_txReceipt", [txHash]);
  }

  async getTokenBalance(address) {
    const balance = await this.readCall("balanceOf", address, [
      { index: 0, format: "hex", value: address },
    ]);
    return parseInt(balance, 16);
  }

  async getMintedBy(address) {
    return await this.readCall("mintedBy", address, [
      { index: 0, format: "hex", value: address },
    ]);
  }

  async getTokenURI(tokenId) {
    const tokenURI = await this.readCall("tokenURI", INFT_CONTRACT.toString(), [
      { index: 0, format: "hex", value: tokenId },
    ]);
    return Buffer.from(tokenURI.replace("0x", ""), "hex").toString("utf8");
  }

  async getTokensOwnedBy(address, balance, from = 0, to = 5) {
    const tokens = [];

    for (let i = from; i < to && i < balance; i++) {
      const token = await this.readCall("tokenOfOwnerByIndex", address, [
        { index: 0, format: "hex", value: address },
        { index: 1, format: "uint64", value: i.toString() },
      ]);
      tokens.push(token);
    }
    return tokens;
  }

  async getTokenOwner(tokenId) {
    return await this.readCall("ownerOf", INFT_CONTRACT.toString(), [
      { index: 0, format: "hex", value: tokenId },
    ]);
  }

  async readCall(method, from = ZERO_ADDRESS, args = []) {
    const receipt = await this.call("contract_estimateCall", [
      {
        contract: INFT_CONTRACT.toString(),
        from,
        method,
        args,
      },
    ]);
    return receipt.actionResult.outputData;
  }

  async call(method, params = [], full = false) {
    const id = ++this.last_id;
    console.log("calling", method);
    const req = await fetch(this.rpcAddr, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method,
        params,
        id,
        key: this.apiKey,
      }),
    }).catch();

    const resp = await req.json();
    console.log("got resp", resp);

    if (resp.error) {
      throw resp.error;
    }
    if (full) {
      return resp;
    } else {
      return resp.result;
    }
  }
}
