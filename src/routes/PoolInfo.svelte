<script lang="ts">
  import { getTokensAndReserves, type Blockchain } from "$lib/blockchain";
  import LoadingButton from "$lib/components/LoadingButton.svelte";
  import Query from "$lib/components/Query.svelte";
  import { createQuery } from "@tanstack/svelte-query";

  export let blockchain: Blockchain;

  $: poolInfo = createQuery({
    queryKey: [
      "poolInfo",
      blockchain.ammContract.address.toString().toLowerCase(),
    ],
    queryFn: async () => {
      const { tokens, reserves } = await getTokensAndReserves();
      const tokenNames = tokens.map(
        (token, i) =>
          blockchain.tokens.find((t) => t.contract.address.equals(token))
            ?.symbol ?? `Token ${i}`,
      );
      return { tokens, tokenNames, reserves };
    },
  });
</script>

<h3 style="margin-bottom: 0">Pool info</h3>
<p>{blockchain.ammContract.address.toString()}</p>

<h4>Reserves</h4>
<LoadingButton class="secondary" onclick={() => $poolInfo.refetch()}>
  Refresh reserves
</LoadingButton>
<Query query={poolInfo} let:data>
  <ul>
    {#each data.tokenNames as tokenName, i (tokenName)}
      <li>
        {tokenName}: {data.reserves[i].toString()}
      </li>
    {/each}
  </ul>
</Query>
