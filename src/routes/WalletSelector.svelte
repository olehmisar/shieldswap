<script context="module" lang="ts">
  import type { Blockchain } from "$lib/blockchain";
  import type { AccountWalletWithPrivateKey } from "@aztec/aztec.js";
  import { writable } from "svelte/store";

  export let selectedWallet = writable<AccountWalletWithPrivateKey | undefined>(
    undefined,
  );
</script>

<script lang="ts">
  export let blockchain: Blockchain;
  let selectedWalletAddress: string = blockchain.wallets[0]
    .getAddress()
    .toString();
  $: $selectedWallet = blockchain.wallets.find(
    (w) => w.getAddress().toString() === selectedWalletAddress,
  );
</script>

<label>
  Select wallet:

  <select bind:value={selectedWalletAddress}>
    {#each blockchain.wallets as wallet}
      <option value={wallet.getAddress().toString()}
        >{wallet.getAddress()}</option
      >
    {/each}
  </select>
</label>
