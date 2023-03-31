import { Address } from "ethereumjs-util";

export const INFT_CONTRACT = Address.fromString(
  "0xd50bb43d94d335c90b8531d9b45009c57ca59351"
);

export const ART_GENERATORS = {
  "iNFT 1.0": Address.fromString("0x013b2c63adcbee5df8d63e4037b90ed0fab46060"),
  // "iNFT 2.0": Address.fromString("0x0000000000000000000000000000000000000000"),
};

// export const CALLBACK_URL = encodeURIComponent("http://localhost:5173/");
export const CALLBACK_URL = encodeURIComponent("https://inft.bus.bz/");

export const NODE_URL = "https://node.bus.bz/";
export const NODE_KEY = "inft";
// export const NODE_URL = "http://127.0.0.1:8100";
// export const NODE_KEY = "123";

export const AUTH_WORKER_URL = "https://workers.bus.bz/idena/auth";
