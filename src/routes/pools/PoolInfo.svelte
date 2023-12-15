<script lang="ts">
  import { blockchain, getTokensAndReserves } from "$lib/blockchain";
  import LoadingButton from "$lib/components/LoadingButton.svelte";
  import Query from "$lib/components/Query.svelte";
  import { createQuery } from "@tanstack/svelte-query";

  $: poolInfo = createQuery({
    queryKey: [
      "poolInfo",
      $blockchain.ammContract.address.toString().toLowerCase(),
    ],
    queryFn: async () => {
      const { tokens, reserves } = await getTokensAndReserves();
      const tokenNames = tokens.map(
        (token, i) =>
          $blockchain.tokens.find((t) => t.contract.address.equals(token))
            ?.symbol ?? `Token ${i}`,
      );
      return { tokens, tokenNames, reserves };
    },
  });
</script>

<h2 style="margin-bottom: 0">Pool info</h2>
<p>Pool address: {$blockchain.ammContract.address.toString()}</p>

<h4 style="margin-bottom: 0">
  Reserves
  <LoadingButton
    class="outline secondary"
    inline
    onclick={() => $poolInfo.refetch()}
  >
    Refresh
  </LoadingButton>
</h4>
<Query query={poolInfo} let:data>
  <ul>
    {#each data.tokenNames as tokenName, i (tokenName)}
      <li>
        {tokenName}: {data.reserves[i].toString()}
      </li>
    {/each}
  </ul>
</Query>
