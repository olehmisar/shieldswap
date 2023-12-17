<script lang="ts">
  import logo from "$lib/assets/logo.svg";
  import { clearContractsCache, clearPoolContractCache } from "$lib/blockchain";
  import ButtonConfirm from "$lib/components/ButtonConfirm.svelte";
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
    {
      name: "Flash loan",
      href: "/flashloan",
    },
  ];
</script>

<header>
  <nav class="container-fluid">
    <ul>
      <li>
        <a href="/"><img src={logo} alt="logo" style="height: 2.3em" /></a>
      </li>
      <li><a href="/" class="secondary"><strong>ShieldSwap</strong></a></li>
    </ul>
    <ul>
      {#each links as link (link.href)}
        <li><a href={link.href} class="secondary">{link.name}</a></li>
      {/each}

      <li>
        <details class="dropdown right">
          <summary>Reset</summary>
          <ul>
            <li>
              <ButtonConfirm
                confirmText="Are you sure you want to redeploy contracts (it takes couple minutes)?"
                class="outline secondary"
                onclick={() => {
                  clearContractsCache();
                  window.location.reload();
                }}
              >
                Reset all contracts
              </ButtonConfirm>
            </li>
            <li>
              <ButtonConfirm
                class="outline secondary"
                confirmText="Are you sure you want to redeploy the pool (it takes couple minutes)?"
                onclick={() => {
                  clearPoolContractCache();
                  window.location.reload();
                }}
              >
                Reset pool
              </ButtonConfirm>
            </li>
          </ul>
        </details>
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
