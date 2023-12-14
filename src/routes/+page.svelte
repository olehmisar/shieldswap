<script lang="ts">
  import {
    clearAmmContractCache,
    clearContractsCache,
    setupBlockchain,
  } from "$lib/blockchain";
  import AddLiquidity from "./AddLiquidity.svelte";
  import Balances from "./Balances.svelte";
  import PoolInfo from "./PoolInfo.svelte";
  import Swap from "./Swap.svelte";
  import WalletSelector, { selectedWallet } from "./WalletSelector.svelte";

  let logs: string[] = ["Deploying contracts..."];
  const blockchainPromise = setupBlockchain((...args) => {
    console.log(...args);
    const log = args.map((x) => String(x)).join(" ");
    logs = [...logs, log];
  });
</script>

<div class="grid">
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

  <button
    class="contrast"
    on:click={() => {
      if (
        !confirm(
          "Are you sure you want to redeploy AMM (it takes couple minutes)?",
        )
      ) {
        return;
      }
      clearAmmContractCache();
      window.location.reload();
    }}
  >
    Redeploy only AMM
  </button>
</div>

{#await blockchainPromise}
  {#each logs as log}
    <p>{log}</p>
  {/each}
{:then blockchain}
  {@const wallet = $selectedWallet}
  <main class="container">
    <WalletSelector {blockchain} />
    {#if wallet}
      <Balances {blockchain} selectedWallet={wallet} />
      <hr />
      <Swap {blockchain} selectedWallet={wallet} />
    {/if}
    <hr />
    <PoolInfo {blockchain} />
    <hr />
    {#if wallet}
      <AddLiquidity {blockchain} selectedWallet={wallet} />
    {/if}
  </main>
{:catch e}
  {#each logs as log}
    <p>{log}</p>
  {/each}
  There was an error deploying the contracts. Restart sandbox and try again.
  {String(e)}
{/await}
