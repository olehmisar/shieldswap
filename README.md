# ShieldSwap DEX

A Decentralized Exchange implemented in Noir for Aztec Network. Frontend is implemented in Svelte.
<img width="809" alt="image" src="https://github.com/olehmisar/aztec-amm/assets/29802592/b024170b-9fa5-449b-aee5-ff9bf5a1bd9e">

## Features

- [x] Create a pool with tokens
- [x] Add liquidity to a pool
- [x] Swap tokens in a pool
- [x] Flash swaps (flash loans)
- [ ] LP tokens
- [ ] Remove liquidity
- [ ] Pool factory
- [ ] Trading fees

## Run

To run locally you need to have Aztec Sandbox running on "localhost:8080". Then run frontend with:

```bash
yarn dev
```

**WARNING**: First open of the page will take a while to deploy and initialize tokens and DEX contracts(logs will be printed to screen and console).

## Building

To create a production version of your app:

```bash
yarn build
```

You can preview the production build with `yarn preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
