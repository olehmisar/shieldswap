<script lang="ts">
  import type { Blockchain } from "$lib/blockchain";
  import { AztecAddress } from "@aztec/aztec.js";
  import { createQuery } from "@tanstack/svelte-query";
  import { ethers } from "ethers";

  export let blockchain: Blockchain;

  $: poolInfo = createQuery({
    queryKey: [
      "poolInfo",
      blockchain.ammContract.address.toString().toLowerCase(),
    ],
    queryFn: async () => {
      const { tokens, reserves } = await ethers.utils.resolveProperties({
        tokens: blockchain.ammContract.methods.tokens().view() as Promise<
          { address: bigint }[]
        >,
        // TODO: replace with balances from token contracts
        reserves: blockchain.ammContract.methods.reserves().view(),
      });

      const tokenNames = tokens.map(
        (token, i) =>
          blockchain.tokens.find((t) =>
            t.contract.address.equals(AztecAddress.fromBigInt(token.address)),
          )?.name ?? `Token ${i}`,
      );
      return { tokenNames, reserves };
    },
  });
</script>

<h3 style="margin-bottom: 0">Pool info</h3>
<p>{blockchain.ammContract.address.toString()}</p>

<h4>Reserves</h4>
{#if $poolInfo.isLoading}
  <p>Loading...</p>
{:else if $poolInfo.isError}
  <p>Error: {$poolInfo.error.message}</p>
{:else if $poolInfo.isSuccess}
  <ul>
    {#each $poolInfo.data.tokenNames as tokenName, i}
      <li>
        {tokenName}: {$poolInfo.data.reserves[i].toString()}
      </li>
    {/each}
  </ul>
{/if}
