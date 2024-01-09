# ShieldSwap DEX

A Decentralized Exchange implemented in Noir for Aztec Network https://shieldswap.vercel.app.
<img width="991" alt="image" src="https://github.com/olehmisar/shieldswap/assets/29802592/70651eba-15a4-4d8d-87f6-dc45e590f3fd">
<img width="991" alt="image" src="https://github.com/olehmisar/shieldswap/assets/29802592/a7b27098-9baa-4fac-bb76-6b1ca0c6d4c3">

## Features

- [x] Create a pool with tokens
- [x] Add liquidity to a pool
- [x] Swap tokens in a pool
- [x] Flash swaps (flash loans)
- [x] LP tokens
- [x] Remove liquidity
- [ ] Pool factory
- [ ] Trading fees

## Run

To run locally you need to have Aztec Sandbox running on "localhost:8080". Then run frontend with:

```bash
yarn dev
```

**WARNING**: The first open will take a few minutes to deploy and initialize tokens and DEX contracts(progress will be printed to screen and console).

## Build

To create a production version of the app:

```bash
yarn build
```

Preview via `yarn preview`. To deploy the app, read more [here](https://kit.svelte.dev/docs/adapters).
