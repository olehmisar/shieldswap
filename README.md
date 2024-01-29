# ShieldSwap DEX

# _NOTE: the repository was moved to the ShieldSwap monorepo._

A Decentralized Exchange implemented in Noir for Aztec Network https://shieldswap.vercel.app.
<img width="941" alt="image" src="https://github.com/olehmisar/shieldswap/assets/29802592/f05ea359-e6a1-44f2-8158-deced6ee82f8">

<img width="941" alt="image" src="https://github.com/olehmisar/shieldswap/assets/29802592/54b18a02-4c96-4eda-b96f-4c8d18d0be0b">

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
