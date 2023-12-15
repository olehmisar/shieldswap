<script lang="ts">
  import { clearAmmContractCache, clearContractsCache } from "$lib/blockchain";
  import { wallet } from "$lib/wallet";
  import WalletSelector from "./WalletSelector.svelte";

  let links = [
    {
      name: "Swap",
      href: "/",
    },
    {
      name: "Pools",
      href: "/pools",
    },
  ];
</script>

<header>
  <nav class="container-fluid">
    <ul>
      <li><a href="/" class="secondary"><strong>ShieldSwap</strong></a></li>
    </ul>
    <ul>
      {#each links as link (link.href)}
        <li><a href={link.href} class="secondary">{link.name}</a></li>
      {/each}

      <li>
        <button
          class="outline secondary"
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
          Redeploy all
        </button>
      </li>
      <li>
        <button
          class="outline secondary"
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
          Redeploy DEX
        </button>
      </li>

      {#if $wallet}
        <li>
          <WalletSelector />
        </li>
      {/if}
    </ul>
  </nav>
</header>

<style>
  header {
    box-shadow: 0 1px 0 gray;
    margin-bottom: 2rem;
  }
</style>
