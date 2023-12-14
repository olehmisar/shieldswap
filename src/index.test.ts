import {
  Blockchain,
  balanceOfPrivate,
  balanceOfPublic,
  estimateSwap,
  getReserves,
  setupBlockchain,
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
    const tokenIn = getToken("WETH");
    const tokenOut = getToken("DAI");
    const balancesBefore = await ethers.utils.resolveProperties({
      in: balanceOfPrivate(tokenIn, alice),
      out: balanceOfPrivate(tokenOut, alice),
    });
    const ammBalancesBefore = await reservesAreInSync(tokenIn, tokenOut);

    const swapInput = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      amountIn: 10n,
    };
    const swapEstimate = await estimateSwap(swapInput);
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
  });

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
