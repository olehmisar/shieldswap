<script lang="ts">
  import { balanceOfPrivate, blockchain } from "$lib/blockchain";
  import LoadingButton from "$lib/components/LoadingButton.svelte";
  import Query from "$lib/components/Query.svelte";
  import { wallet } from "$lib/wallet";
  import type { AccountWalletWithPrivateKey } from "@aztec/aztec.js";
  import type { TokenContract } from "@aztec/noir-contracts/types";
  import { createQuery } from "@tanstack/svelte-query";
  import { ethers } from "ethers";

  async function getBalance(
    token: TokenContract,
    wallet: AccountWalletWithPrivateKey,
  ) {
    let {
      privateBalance,
      //  publicBalance
    } = await ethers.utils.resolveProperties({
      privateBalance: balanceOfPrivate(token, wallet),
      // publicBalance: balanceOfPublic(token, wallet.getAddress()),
    });
    return `${privateBalance}`;
  }

  $: balances = createQuery({
    queryKey: ["balances", $wallet.getAddress().toString()],
    queryFn: () =>
      Promise.all(
        $blockchain.tokens.map(
          async (token) =>
            `${token.symbol}: ${await getBalance(token.contract, $wallet)}`,
        ),
      ),
  });
</script>

<h2>
  My balances
  <LoadingButton
    class="outline secondary"
    inline
    style="margin-bottom: 0"
    onclick={() => $balances.refetch()}
  >
    Refresh
  </LoadingButton>
</h2>
<Query query={balances} let:data>
  <ul>
    {#each data as balance (balance)}
      <li>{balance}</li>
    {/each}
  </ul>
</Query>
