<script lang="ts">
  import {
    estimateSwap,
    swap,
    type Blockchain,
    type SwapEstimate,
    type SwapInput,
  } from "$lib/blockchain";
  import type { AccountWalletWithPrivateKey } from "@aztec/aztec.js";
  import { createQuery } from "@tanstack/svelte-query";
  import { assert } from "ts-essentials";

  export let blockchain: Blockchain;
  export let selectedWallet: AccountWalletWithPrivateKey;

  let selectedTokenIn: string =
    blockchain.tokens[0].contract.address.toString();

  let swapFormEl: HTMLFormElement;

  async function getSwapInputAndEstimate() {
    const formData = new FormData(swapFormEl);
    const data = Object.fromEntries(formData.entries());
    console.log("data", data);
    const tokenIn = blockchain.tokens.find(
      (t) =>
        t.contract.address.toString().toLowerCase() ===
        (data.tokenIn as string).toLowerCase(),
    );
    const tokenOut = blockchain.tokens.find(
      (t) =>
        t.contract.address.toString().toLowerCase() ===
        (data.tokenOut as string).toLowerCase(),
    );
    assert(tokenIn && tokenOut, "invalid token selection");
    const amountIn = BigInt(data.amountIn.toString());
    const swapInput = {
      tokenIn: tokenIn.contract,
      tokenOut: tokenOut.contract,
      amountIn,
    };
    const swapEstimate = await estimateSwap(swapInput);
    return { swapInput, swapEstimate };
  }

  let swapInfoPromise: Promise<{
    swapInput: SwapInput;
    swapEstimate: SwapEstimate;
  }> | null = null;
  let swapId = 0;
  function onInput() {
    swapId++;
    swapInfoPromise = getSwapInputAndEstimate();
  }

  $: swapInfo = createQuery({
    queryKey: ["swapInfo", swapId],
    queryFn: () => swapInfoPromise,
  });

  let loading = false;
  async function onSubmit(event: Event) {
    event.preventDefault();
    try {
      assert(event.target === swapFormEl, "invalid form reference");
      if (!$swapInfo.isSuccess || !$swapInfo.data) {
        throw new Error("invalid swap info");
      }
      const { swapInput, swapEstimate } = $swapInfo.data;
      await swap(swapInput, swapEstimate, selectedWallet);
      alert("Swap successful");
    } catch (e: any) {
      alert("Swap error: " + e?.message);
      throw e;
    } finally {
    }
  }
</script>

<h1>Swap tokens</h1>

<form
  bind:this={swapFormEl}
  on:input={onInput}
  on:submit|preventDefault={async (e) => {
    try {
      loading = true;
      await onSubmit(e);
    } finally {
      loading = false;
    }
  }}
>
  <h3>From token</h3>
  <div class="grid">
    <label for="tokenIn">
      Swap from
      <select id="tokenIn" name="tokenIn" bind:value={selectedTokenIn}>
        {#each blockchain.tokens as token}
          <option value={token.contract.address.toString()}>
            {token.name}
          </option>
        {/each}
      </select>
    </label>
    <label for="amountIn">
      Amount from
      <input type="number" id="amountIn" name="amountIn" placeholder="100" />
    </label>
  </div>

  <h3>To token</h3>
  <div class="grid">
    <label for="tokenOut">
      Swap to
      <select id="tokenOut" name="tokenOut">
        {#each blockchain.tokens.filter((t) => t.contract.address
              .toString()
              .toLowerCase() !== selectedTokenIn.toLowerCase()) as token}
          <option value={token.contract.address.toString()}>
            {token.name}
          </option>
        {/each}
      </select>
    </label>
    <label for="amountOut">
      Amount to
      <input
        readonly
        value={$swapInfo.isSuccess
          ? $swapInfo.data?.swapEstimate.amountOut ?? ""
          : "Loading..."}
      />
    </label>
  </div>
  <button type="submit" aria-busy={loading} disabled={loading}>Swap</button>
</form>
