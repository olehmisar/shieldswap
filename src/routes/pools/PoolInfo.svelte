<script lang="ts">
  import {
    balanceOfPublic,
    blockchain,
    getTokensAndReserves,
  } from "$lib/blockchain";
  import LoadingButton from "$lib/components/LoadingButton.svelte";
  import Query from "$lib/components/Query.svelte";
  import { createQuery } from "@tanstack/svelte-query";

  $: poolInfo = createQuery({
    queryKey: [
      "poolInfo",
      $blockchain.poolContract.address.toString().toLowerCase(),
    ],
    queryFn: async () => {
      const { tokens, reserves } = await getTokensAndReserves();
      const balances = await Promise.all(
        tokens.map(async (token) => {
          const contract = $blockchain.getToken(token)?.contract;
          if (!contract) {
            return "N/A";
          }
          return await balanceOfPublic(
            contract,
            $blockchain.poolContract.address,
          );
        }),
      );
      return { tokens, reserves, balances };
    },
  });
</script>

<h1>Pool info</h1>
<p>Pool address: {$blockchain.poolContract.address.toString()}</p>

<h2>
  Reserves
  <LoadingButton
    class="outline secondary"
    inline
    style="margin-bottom: 0"
    onclick={() => $poolInfo.refetch()}
  >
    Refresh
  </LoadingButton>
</h2>
<Query query={poolInfo} let:data>
  <table>
    <thead>
      <tr>
        <th>Token</th>
        <th>Reserve</th>
        <th>Actual balance</th>
      </tr>
    </thead>
    <tbody>
      {#each data.tokens as token, i (token.toString())}
        <tr>
          <td>{$blockchain.getTokenSymbolOrAddress(token)}</td>
          <td>{data.reserves[i].toString()}</td>
          <td>{data.balances[i].toString()}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</Query>
