<script lang="ts">
  import { clearContractsCache, setupBlockchain } from "$lib/blockchain";
  import Balances from "./Balances.svelte";
  import Swap from "./Swap.svelte";
  import WalletSelector, { selectedWallet } from "./WalletSelector.svelte";

  let logs: string[] = ["Deploying contracts..."];
  const blockchainPromise = setupBlockchain((...args) => {
    console.log(...args);
    const log = args.map((x) => String(x)).join(" ");
    logs = [...logs, log];
  });
</script>

<button
  class="contrast"
  on:click={() => {
    if (
      !confirm(
        "Are you sure you want to redeploy contracts (it takes couple minutes)?",
      )
    ) {
      return;
    }
    clearContractsCache();
    window.location.reload();
  }}
>
  Redeploy contracts
</button>

{#await blockchainPromise}
  {#each logs as log}
    <p>{log}</p>
  {/each}
{:then blockchain}
  {@const wallet = $selectedWallet}
  <WalletSelector {blockchain} />
  {#if wallet}
    <Balances {blockchain} selectedWallet={wallet} />
    <Swap {blockchain} selectedWallet={wallet} />
  {/if}
{:catch e}
  {#each logs as log}
    <p>{log}</p>
  {/each}
  {@debug e}
  There was an error deploying the contracts. Restart sandbox and try again.
  {String(e)}
{/await}
