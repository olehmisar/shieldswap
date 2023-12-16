<script lang="ts">
  import {
    blockchain,
    estimateSwap,
    swap,
    type SwapEstimate,
    type SwapInput,
  } from "$lib/blockchain";
  import Form from "$lib/components/Form.svelte";
  import SubmitButton from "$lib/components/SubmitButton.svelte";
  import { wallet } from "$lib/wallet";
  import { createQuery } from "@tanstack/svelte-query";
  import { assert } from "ts-essentials";

  let selectedTokenIn: string =
    $blockchain.tokens[0].contract.address.toString();

  async function getSwapInputAndEstimate(form: HTMLFormElement) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    console.log("data", data);
    const tokenIn = $blockchain.getToken(data.tokenIn.toString());
    const tokenOut = $blockchain.getToken(data.tokenOut.toString());
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
  function oninput(
    e: Event & { currentTarget: EventTarget & HTMLFormElement },
  ) {
    swapId++;
    swapInfoPromise = getSwapInputAndEstimate(e.currentTarget);
  }

  $: swapInfo = createQuery({
    queryKey: ["swapInfo", swapId],
    queryFn: () => swapInfoPromise,
  });

  async function onsubmit() {
    if (!$swapInfo.isSuccess || !$swapInfo.data) {
      throw new Error("invalid swap info");
    }
    const { swapInput, swapEstimate } = $swapInfo.data;
    await swap(swapInput, swapEstimate, $wallet);
  }
</script>

<h1>Swap tokens</h1>

<Form {oninput} {onsubmit} let:loading>
  <h4>From token</h4>
  <div role="group">
    <select name="tokenIn" bind:value={selectedTokenIn}>
      {#each $blockchain.tokens as token (token.contract.address.toString())}
        <option value={token.contract.address.toString()}>
          {token.symbol}
        </option>
      {/each}
    </select>
    <input type="number" name="amountIn" required placeholder="0" />
  </div>

  <h4>To token</h4>
  <div role="group">
    <select name="tokenOut">
      {#each $blockchain.tokens.filter((t) => t.contract.address
            .toString()
            .toLowerCase() !== selectedTokenIn.toLowerCase()) as token (token.contract.address.toString())}
        <option value={token.contract.address.toString()}>
          {token.symbol}
        </option>
      {/each}
    </select>
    <input
      readonly
      value={$swapInfo.isSuccess
        ? $swapInfo.data?.swapEstimate.amountOut ?? ""
        : $swapInfo.isError
          ? String($swapInfo.error.message)
          : "Loading..."}
    />
  </div>
  <SubmitButton {loading}>Swap</SubmitButton>
</Form>
