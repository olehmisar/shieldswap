<script lang="ts">
  import {
    blockchain,
    clearContractCache,
    deployContractCached,
    getContractCached,
    getTokens,
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
      const tokens = await getTokens();
      const [balance0, balance1] = await flashLoanContract
        .withWallet($wallet)
        .methods.last_balances()
        .view();
      const balances = [BigInt(balance0), BigInt(balance1)] as const;
      return { tokens, balances };
    },
  });
</script>

<svelte:head>
  <title>Flash loan - ShieldSwap</title>
</svelte:head>

<main class="container">
  <h1>Flash loan</h1>
  <p>
    This page demostrates a flash loan. By clicking the "Flash loan!" button, a
    flash loan contract will:
  </p>
  <ol>
    <li>Borrow all available tokens from the DEX pool</li>
    <li>Record how many tokens were borrowed</li>
    <li>Return the tokens to the DEX pool in the same transaction</li>
  </ol>
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
        .methods.flash_loan(
          $blockchain.poolContract.address,
          reserve0,
          reserve1,
        )
        .send()
        .wait();
      $lastBalances.refetch();
    }}
  >
    Flash loan!
  </LoadingButton>

  <LoadingButton
    disabled={!flashLoanContract}
    class="secondary"
    onclick={async () => {
      if (!flashLoanContract) return;
      await flashLoanContract
        .withWallet($wallet)
        .methods.reset_last_balances()
        .send()
        .wait();
      $lastBalances.refetch();
    }}
  >
    Reset last borrow record
  </LoadingButton>

  <h4>Last recorded borrow</h4>
  <Query query={lastBalances} let:data>
    {#if !data}
      <p>Deploy the flash loan contract to see last borrow record</p>
    {:else}
      <ul>
        {#each data.tokens as token, i (token.toString())}
          <li>
            {$blockchain.getTokenSymbolOrAddress(token)}
            {data.balances[i].toString()}
          </li>
        {/each}
      </ul>
    {/if}
  </Query>
</main>
