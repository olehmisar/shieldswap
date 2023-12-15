<script lang="ts">
  import {
    balanceOfPrivate,
    balanceOfPublic,
    type Blockchain,
  } from "$lib/blockchain";
  import LoadingButton from "$lib/components/LoadingButton.svelte";
  import Query from "$lib/components/Query.svelte";
  import type { AccountWalletWithPrivateKey } from "@aztec/aztec.js";
  import type { TokenContract } from "@aztec/noir-contracts/types";
  import { createQuery } from "@tanstack/svelte-query";
  import { ethers } from "ethers";

  export let blockchain: Blockchain;
  export let selectedWallet: AccountWalletWithPrivateKey;

  async function getBalance(
    token: TokenContract,
    wallet: AccountWalletWithPrivateKey,
  ) {
    let { privateBalance, publicBalance } =
      await ethers.utils.resolveProperties({
        privateBalance: balanceOfPrivate(token, wallet),
        publicBalance: balanceOfPublic(token, wallet.getAddress()),
      });
    return `private: ${privateBalance}, public: ${publicBalance}`;
  }

  $: balances = createQuery({
    queryKey: ["balances", selectedWallet.getAddress().toString()],
    queryFn: () =>
      Promise.all(
        blockchain.tokens.map(
          async (token) =>
            `${token.symbol}: ${await getBalance(
              token.contract,
              selectedWallet,
            )}`,
        ),
      ),
  });
</script>

<h3 style="margin-bottom: 0">Balances</h3>
<LoadingButton class="secondary" onclick={() => $balances.refetch()}>
  Refresh balances
</LoadingButton>
<Query query={balances} let:data>
  <ul>
    {#each data as balance (balance)}
      <li>{balance}</li>
    {/each}
  </ul>
</Query>
