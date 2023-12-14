<script lang="ts">
  import { addLiquidity, sortTokens, type Blockchain } from "$lib/blockchain";
  import Form from "$lib/components/Form.svelte";
  import SubmitButton from "$lib/components/SubmitButton.svelte";
  import type { AccountWalletWithPrivateKey } from "@aztec/aztec.js";

  export let blockchain: Blockchain;
  export let selectedWallet: AccountWalletWithPrivateKey;

  const [token0_] = sortTokens(
    blockchain.tokens[0].contract,
    blockchain.tokens[1].contract,
  );
  const tokens = token0_.address.equals(blockchain.tokens[0].contract.address)
    ? [blockchain.tokens[0], blockchain.tokens[1]]
    : [blockchain.tokens[1], blockchain.tokens[0]];

  async function onsubmit(event: Event & { currentTarget: HTMLFormElement }) {
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const amount0 = BigInt(data.amount0.toString());
    const amount1 = BigInt(data.amount1.toString());

    await addLiquidity(
      tokens[0].contract,
      tokens[1].contract,
      amount0,
      amount1,
      selectedWallet,
    );
  }
</script>

<h2 style="margin-bottom: 0">Add liquidity</h2>
<p style="font-style: italic">
  Currenly you can add liquidity with any ratio. Will be fixed later
</p>

<Form {onsubmit} let:loading>
  <div class="grid">
    {#each tokens as token, i (token.contract.address.toString())}
      <label>
        {token.symbol}:
        <input type="number" name="amount{i}" placeholder="0" required />
      </label>
    {/each}
  </div>

  <SubmitButton {loading}>Add liquidity</SubmitButton>
</Form>
