<script lang="ts">
  import { blockchain } from "$lib/blockchain";
  import { wallet } from "$lib/wallet";

  let selectedWalletAddress: string = $blockchain.wallets[0]
    .getAddress()
    .toString();
  $: {
    let maybeWallet = $blockchain.wallets.find(
      (w) => w.getAddress().toString() === selectedWalletAddress,
    );
    if (maybeWallet) {
      $wallet = maybeWallet;
    }
  }
</script>

<select bind:value={selectedWalletAddress}>
  {#each $blockchain.wallets as wallet (wallet.getAddress().toString())}
    <option value={wallet.getAddress().toString()}>
      {wallet.getAddress().toShortString()}
    </option>
  {/each}
</select>
