# iNFT – an onchain NFT for Idena identities

This is a fully onchain ERC721-compatible NFT that can be generated by validated identities in Idena.

You can use it here: https://inft.bus.bz

Since original art is not my strong suit, this is mostly a proof-of-concept for a generative NFT on Idena that could be used as a basis for another project in the future.

## Features
* Fully onchain art generation and storage
* Ability to choose a different art contract for each token (though there's only one contract now)
* Almost full compatibility with ERC721 standard (with Metadata and Enumerable extensions)
* If you own an iNFT of another identity then you'll be able to regenerate it as long as that identity stays validated
* Attributes in token metadata created by the art contract (like identity status and age)

## Screenshot
<img src="/screenshots/inft_1.png?raw=true" height="150">

## Building

1. Build `irc721` contract: `yarn asb`
2. Build `nft_generator` contract: `yarn asb`
3. Set the deployed art generator as approved using the `setApprovedGenerator` method
4. Deploy a Cloudflare Worker for authentication: `frontend/worker.js`
5. Specify contract addresses and URLs in `frontend/src/config.js`
6. Build `frontend`: `npm run build`

### Testing
Currently tests require a modified contract runner that supports sending transactions from different addresses. I'll try to upstream these changes because I believe they're essential for testing.

## Attributions
* [Vue](https://github.com/vuejs/vue/) - MIT License, Copyright (c) 2013-present, Yuxi (Evan) You
* [Bootstrap](https://github.com/twbs/bootstrap) - MIT License, Copyright (c) 2011-2023 The Bootstrap Authors
* [Bootstrap-vue](https://github.com/bootstrap-vue/bootstrap-vue) - MIT License, Copyright (c) 2016-2023 - BootstrapVue
* [Ethereumjs-util](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/util) - MPL-2.0 License
* [Uniswap V3](https://github.com/Uniswap/v3-periphery) - MIT License, Copyright (c) 2023 Uniswap Labs


### Copyright and license
This program is released under the MIT License (see LICENSE file).

Copyright © 2023 bus.
