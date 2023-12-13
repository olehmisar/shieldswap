# Aztec AMM

Uniswap AMM implemented in Noir lang for Aztec Network. Frontend is implemented in Svelte.

## Run

To run locally you need to have Aztec Sandbox running on "localhost:8080". Then run frontend with:

```bash
yarn dev
```

**WARNING**: First open of the page will take a while to deploy and initialize tokens and AMM contracts(logs will be printed to screen and console).

## Building

To create a production version of your app:

```bash
yarn build
```

You can preview the production build with `yarn preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
