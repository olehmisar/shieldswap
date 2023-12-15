<script lang="ts">
  import { browser } from "$app/environment";
  import { blockchain, setupBlockchain } from "$lib/blockchain";
  import { wallet } from "$lib/wallet";
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import Header from "./Header.svelte";

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
      },
    },
  });

  let logs: string[] = ["Deploying contracts..."];
  const blockchainPromise = setupBlockchain((...args) => {
    console.log(...args);
    const log = args.map((x) => String(x)).join(" ");
    logs = [...logs, log];
  }).then((b) => {
    $blockchain = b;
    $wallet = b.wallets[0];
  });
</script>

<Header />

<QueryClientProvider client={queryClient}>
  {#if !$blockchain}
    {#each logs as log}
      <p>{log}</p>
    {/each}
  {/if}
  {#await blockchainPromise then}
    <slot />
  {:catch e}
    There was an error deploying the contracts. Restart sandbox and try again.
    {String(e)}
  {/await}
</QueryClientProvider>
