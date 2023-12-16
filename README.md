# ShieldSwap DEX

A Decentralized Exchange implemented in Noir for Aztec Network. Frontend is implemented in Svelte.
<img width="895" alt="image" src="https://github.com/olehmisar/aztec-amm/assets/29802592/871b44d5-176d-432f-a2c0-25cf9cb787f4">

## Features

- [x] Create a pool with tokens
- [x] Add liquidity to a pool
- [x] Swap tokens in a pool
- [ ] LP tokens
- [ ] Remove liquidity
- [ ] Pool factory
- [ ] Flash swaps (flash loans)
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
