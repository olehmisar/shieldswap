import {
  Blockchain,
  addLiquidity,
  balanceOfPrivate,
  balanceOfPublic,
  estimateSwap,
  getReserves,
  setupBlockchain,
  sortTokens,
  swap,
} from "$lib/blockchain";
import type { AccountWalletWithPrivateKey } from "@aztec/aztec.js";
import type { TokenContract } from "@aztec/noir-contracts/types";
import { ethers } from "ethers";
import { assert } from "ts-essentials";
import { beforeAll, describe, expect, test } from "vitest";

describe("amm", () => {
  let blockchain: Blockchain;
  let alice: AccountWalletWithPrivateKey;
  beforeAll(async () => {
    blockchain = await setupBlockchain();
    [alice] = blockchain.wallets;
  }, 999999);

  function getToken(symbol: string) {
    const token = blockchain.tokens.find((token) => token.symbol === symbol);
    assert(token, `Token ${symbol} not found`);
    return token.contract;
  }

  test("swap WETH to DAI", async () => {
    await testSwap("WETH", "DAI", 4n);
  });
  test("swap DAI to WETH", async () => {
    await testSwap("DAI", "WETH", 1000n);
  });
  async function testSwap(
    tokenInName: string,
    tokenOutName: string,
    amountIn: bigint,
  ) {
    const { swapInput, swapEstimate } = await makeSwapInput(
      tokenInName,
      tokenOutName,
      amountIn,
    );
    const { tokenIn, tokenOut } = swapInput;

    const balancesBefore = await ethers.utils.resolveProperties({
      in: balanceOfPrivate(tokenIn, alice),
      out: balanceOfPrivate(tokenOut, alice),
    });
    const ammBalancesBefore = await reservesAreInSync(tokenIn, tokenOut);

    await swap(swapInput, swapEstimate, alice);

    const balancesAfter = await ethers.utils.resolveProperties({
      in: balanceOfPrivate(tokenIn, alice),
      out: balanceOfPrivate(tokenOut, alice),
    });
    expect(balancesAfter.in).to.eq(balancesBefore.in - swapInput.amountIn);
    expect(balancesAfter.out).to.eq(
      balancesBefore.out + swapEstimate.amountOut,
    );

    const ammBalancesAfter = await reservesAreInSync(tokenIn, tokenOut);
    expect(ammBalancesAfter[0]).to.eq(
      ammBalancesBefore[0] + swapInput.amountIn,
    );
    expect(ammBalancesAfter[1]).to.eq(
      ammBalancesBefore[1] - swapEstimate.amountOut,
    );
  }

  test("fails to swap if amountOut is too high", async () => {
    const { swapInput, swapEstimate } = await makeSwapInput(
      "DAI",
      "WETH",
      1000n,
    );
    const badSwapEstimate = { amountOut: swapEstimate.amountOut + 1n };
    await expect(swap(swapInput, badSwapEstimate, alice)).rejects.toThrow(
      "Shieldswap: K",
    );
  });

  test("fails to swap if amount in is 0", async () => {
    const { swapInput, swapEstimate } = await makeSwapInput("DAI", "WETH", 0n);
    await expect(swap(swapInput, swapEstimate, alice)).rejects.toThrow(
      "Shieldswap: INSUFFICIENT_INPUT_AMOUNT",
    );
  });

  test("fails to swap if amount out is 0", async () => {
    const { swapInput } = await makeSwapInput("DAI", "WETH", 1000n);
    await expect(swap(swapInput, { amountOut: 0n }, alice)).rejects.toThrow(
      "Shieldswap: INSUFFICIENT_OUTPUT_AMOUNT",
    );
  });

  test("fails to swap if tokens are the same", async () => {
    const { swapInput, swapEstimate } = await makeSwapInput(
      "DAI",
      "WETH",
      1000n,
    );
    await expect(
      swap({ ...swapInput, tokenOut: swapInput.tokenIn }, swapEstimate, alice),
    ).rejects.toThrow("Shieldswap: INVALID_TOKEN_ADDRESSES");
  });

  test.todo('fails to swap if "tokenIn" is invalid', async () => {
    expect.fail("todo");
  });

  test.todo('fails to swap if "tokenOut" is invalid', async () => {
    expect.fail("todo");
  });

  test.todo("fails to swap if tokens are not in order", async () => {
    expect.fail("todo");
  });

  test("add liquidity to WETH + DAI", async () => {
    await testAddLiquidity("WETH", "DAI", 4n, 1000n);
  });

  test("add liquidity to DAI + WETH", async () => {
    await testAddLiquidity("DAI", "WETH", 1000n, 4n);
  });

  async function testAddLiquidity(
    tokenAName: string,
    tokenBName: string,
    amountA: bigint,
    amountB: bigint,
  ) {
    const tokenA = getToken(tokenAName);
    const tokenB = getToken(tokenBName);
    const balancesBefore = await ethers.utils.resolveProperties({
      tokenA: balanceOfPrivate(tokenA, alice),
      tokenB: balanceOfPrivate(tokenB, alice),
    });
    const ammBalancesBefore = await reservesAreInSync(tokenA, tokenB);

    await addLiquidity(tokenA, tokenB, amountA, amountB, alice);

    const balancesAfter = await ethers.utils.resolveProperties({
      tokenA: balanceOfPrivate(tokenA, alice),
      tokenB: balanceOfPrivate(tokenB, alice),
    });
    expect(balancesAfter.tokenA).to.eq(balancesBefore.tokenA - amountA);
    expect(balancesAfter.tokenB).to.eq(balancesBefore.tokenB - amountB);

    const ammBalancesAfter = await reservesAreInSync(tokenA, tokenB);
    expect(ammBalancesAfter[0]).to.eq(ammBalancesBefore[0] + amountA);
    expect(ammBalancesAfter[1]).to.eq(ammBalancesBefore[1] + amountB);
  }

  test("fails to add liquidity if tokens are the same", async () => {
    const [token0, token1] = sortTokens(getToken("WETH"), getToken("DAI"));
    await expect(addLiquidity(token1, token1, 1n, 1n, alice)).rejects.toThrow(
      "Shieldswap: INVALID_TOKEN_ADDRESSES",
    );
    await expect(addLiquidity(token0, token0, 1n, 1n, alice)).rejects.toThrow(
      "Shieldswap: INVALID_TOKEN_ADDRESSES",
    );
  });

  test.todo("fails to add liquidity if tokens are not in order", async () => {
    const [token0, token1] = sortTokens(getToken("WETH"), getToken("DAI"));
    // `addLiquidity` sorts tokens internally. Test it with direct contract call instead
    await expect(addLiquidity(token1, token0, 1n, 1n, alice)).rejects.toThrow(
      "Shieldswap: INVALID_TOKEN_ADDRESSES",
    );
  });

  test('fails to add liquidity if "amount0" or "amount1" is 0', async () => {
    const [token0, token1] = sortTokens(getToken("WETH"), getToken("DAI"));
    await expect(addLiquidity(token0, token1, 0n, 1n, alice)).rejects.toThrow(
      "Shieldswap: INSUFFICIENT_LIQUIDITY_MINTED",
    );
    await expect(addLiquidity(token0, token1, 1n, 0n, alice)).rejects.toThrow(
      "Shieldswap: INSUFFICIENT_LIQUIDITY_MINTED",
    );
  });

  test.todo('fails to add liquidity if "tokenA" is invalid', async () => {
    expect.fail("todo");
  });

  test.todo('fails to add liquidity if "tokenB" is invalid', async () => {
    expect.fail("todo");
  });

  async function makeSwapInput(
    tokenInName: string,
    tokenOutName: string,
    amountIn: bigint,
  ) {
    const swapInput = {
      tokenIn: getToken(tokenInName),
      tokenOut: getToken(tokenOutName),
      amountIn,
    };
    const swapEstimate = await estimateSwap(swapInput);
    return { swapInput, swapEstimate };
  }

  async function reservesAreInSync(
    tokenA: TokenContract,
    tokenB: TokenContract,
  ) {
    const { balanceA, balanceB, reserves } =
      await ethers.utils.resolveProperties({
        balanceA: balanceOfPublic(tokenA, blockchain.ammContract.address),
        balanceB: balanceOfPublic(tokenB, blockchain.ammContract.address),
        reserves: getReserves(tokenA, tokenB),
      });
    expect(reserves[0]).to.eq(balanceA);
    expect(reserves[1]).to.eq(balanceB);
    return [balanceA, balanceB] as const;
  }
});
