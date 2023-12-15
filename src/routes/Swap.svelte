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
    const tokenIn = $blockchain.tokens.find(
      (t) =>
        t.contract.address.toString().toLowerCase() ===
        (data.tokenIn as string).toLowerCase(),
    );
    const tokenOut = $blockchain.tokens.find(
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

<h1 style="margin-bottom: 0">Swap tokens</h1>

<Form {oninput} {onsubmit} let:loading>
  <h4>From token</h4>
  <div class="grid">
    <label for="tokenIn">
      Swap from
      <select id="tokenIn" name="tokenIn" bind:value={selectedTokenIn}>
        {#each $blockchain.tokens as token (token.contract.address.toString())}
          <option value={token.contract.address.toString()}>
            {token.symbol}
          </option>
        {/each}
      </select>
    </label>
    <label for="amountIn">
      Amount from
      <input
        type="number"
        id="amountIn"
        name="amountIn"
        required
        placeholder="0"
      />
    </label>
  </div>

  <h4>To token</h4>
  <div class="grid">
    <label for="tokenOut">
      Swap to
      <select id="tokenOut" name="tokenOut">
        {#each $blockchain.tokens.filter((t) => t.contract.address
              .toString()
              .toLowerCase() !== selectedTokenIn.toLowerCase()) as token (token.contract.address.toString())}
          <option value={token.contract.address.toString()}>
            {token.symbol}
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
          : $swapInfo.isError
            ? String($swapInfo.error.message)
            : "Loading..."}
      />
    </label>
  </div>
  <SubmitButton {loading}>Swap</SubmitButton>
</Form>
