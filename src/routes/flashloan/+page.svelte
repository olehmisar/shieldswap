<script lang="ts">
  import {
    blockchain,
    clearContractCache,
    deployContractCached,
    getContractCached,
    getTokensAndReserves,
  } from "$lib/blockchain";
  import LoadingButton from "$lib/components/LoadingButton.svelte";
  import Query from "$lib/components/Query.svelte";
  import { wallet } from "$lib/wallet";
  import { createQuery } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import { FlashLoanContract } from "../../contracts/flash_loan/target/FlashLoan";

  const flashLoanContractName = "flashloan";
  let flashLoanContract: FlashLoanContract | undefined;
  onMount(async () => {
    flashLoanContract = await getContractCached(
      flashLoanContractName,
      (address) => FlashLoanContract.at(address, $wallet),
    );
  });

  $: lastBalances = createQuery({
    queryKey: [
      "lastBalances",
      flashLoanContract?.address.toString().toLowerCase(),
    ],
    async queryFn() {
      if (!flashLoanContract) {
        return null;
      }
      const [balance0, balance1] = await flashLoanContract
        .withWallet($wallet)
        .methods.last_balances()
        .view();
      return [BigInt(balance0), BigInt(balance1)] as const;
    },
  });
</script>

<main class="container">
  <h1 style="margin-bottom: 0">Flash loan</h1>
  <LoadingButton
    class="secondary"
    onclick={async () => {
      clearContractCache(flashLoanContractName);
      flashLoanContract = undefined;
      flashLoanContract = await deployContractCached(
        flashLoanContractName,
        (address) => FlashLoanContract.at(address, $wallet),
        () => {
          return FlashLoanContract.deploy($wallet).send().deployed();
        },
      );
      $lastBalances.refetch();
    }}
  >
    Deploy flash loan contract
  </LoadingButton>

  <LoadingButton
    disabled={!flashLoanContract}
    onclick={async () => {
      if (!flashLoanContract) return;
      console.log("Flash loan!");
      const {
        reserves: [reserve0, reserve1],
      } = await getTokensAndReserves();
      console.log(`flash loan ${reserve0} and ${reserve1} tokens`);
      await flashLoanContract
        .withWallet($wallet)
        .methods.flash_loan($blockchain.ammContract.address, reserve0, reserve1)
        .send()
        .wait();
      $lastBalances.refetch();
    }}
  >
    Flash loan!
  </LoadingButton>

  <h4>Last balances</h4>
  <Query query={lastBalances} let:data>
    {#if !data}
      <p>Deploy the flash loan contract to see balances</p>
    {:else}
      <ul>
        {#each data as balance}
          <li>{balance.toString()}</li>
        {/each}
      </ul>
    {/if}
  </Query>
</main>
