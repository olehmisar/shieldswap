import {
  AccountWalletWithPrivateKey,
  AztecAddress,
  ExtendedNote,
  Fr,
  Note,
  TxHash,
  computeAuthWitMessageHash,
  computeMessageSecretHash,
  createPXEClient,
  getSandboxAccountsWallets,
  init,
  waitForSandbox,
  type FunctionCall,
  type PXE,
} from "@aztec/aztec.js";
import { TokenContract } from "@aztec/noir-contracts/types";
import { ethers } from "ethers";
import { writable } from "svelte/store";
import { assert, type DeepPick } from "ts-essentials";
import { ShieldswapPoolContract } from "../contracts/shieldswap_pool/target/ShieldswapPool";

export const blockchain = writable<Blockchain>();

const PXE_URL = "http://localhost:8080";

const defaultLog: Log = console.log.bind(console);

const pendingShieldsStorageSlot = new Fr(5);

const storage =
  typeof localStorage !== "undefined"
    ? localStorage
    : {
        _map: new Map(),
        getItem(key: string) {
          return this._map.get(key);
        },
        setItem(key: string, value: string) {
          this._map.set(key, value);
        },
        removeItem(key: string) {
          this._map.delete(key);
        },
        key(index: number) {
          return Array.from(this._map.keys())[index];
        },
      };

let poolContract: ShieldswapPoolContract;
let pxe: PXE;
export type Blockchain = Awaited<ReturnType<typeof setupBlockchain>>;
const POOL_CACHE_NAME = "pool";
export async function setupBlockchain(log = defaultLog) {
  log("initializing...");
  await init();
  pxe = createPXEClient(PXE_URL);
  log("waiting for sandbox...");
  await waitForSandbox(pxe);

  // The sandbox comes with a set of created accounts. Load them
  log("loading wallets...");
  const [deployer, alice, bob] = await getSandboxAccountsWallets(pxe);
  log("Done");

  const { wethToken, daiToken } = await ethers.utils.resolveProperties({
    wethToken: deployTokenCached(
      "weth",
      deployer,
      [
        { wallet: deployer, amount: 1000n },
        { wallet: alice, amount: 100n },
      ],
      log,
    ),
    daiToken: deployTokenCached(
      "dai",
      deployer,
      [
        { wallet: deployer, amount: 1_000_000n },
        { wallet: alice, amount: 30_000n },
      ],
      log,
    ),
  });

  poolContract = await deployContractCached(
    POOL_CACHE_NAME,
    (address) => ShieldswapPoolContract.at(address, deployer),
    async () => {
      const [token0, token1] = sortTokens(wethToken, daiToken);
      poolContract = await ShieldswapPoolContract.deploy(
        deployer,
        deployer.getAddress(),
        token0.address,
        token1.address,
      )
        .send()
        .deployed();
      await printBalances();
      {
        const [wethLiq, daiLiq] = [23n, 10000n];
        const [liq0, liq1] = token0.address.equals(wethToken.address)
          ? [wethLiq, daiLiq]
          : [daiLiq, wethLiq];
        await addLiquidity(token0, token1, liq0, liq1, deployer, log);
        await printBalances();
      }
      return poolContract;
    },
    log,
  );

  async function printBalances() {
    for (const [tokenName, token] of Object.entries({ wethToken, daiToken })) {
      console.log(`${tokenName} balances:`);
      for (const [name, wallet] of Object.entries({
        alice,
        bob,
        ShieldswapContract: poolContract,
      })) {
        const address =
          "address" in wallet ? wallet.address : wallet.getAddress();
        console.log(
          `${name} balance`,
          "getAddress" in wallet
            ? await balanceOfPrivate(token, wallet)
            : "N/D",
          "+",
          await balanceOfPublic(token, address),
        );
      }
      console.log();
    }
  }

  const tokens = [
    { symbol: "WETH", contract: wethToken },
    { symbol: "DAI", contract: daiToken },
  ];

  function getToken(token: AztecAddress | string) {
    const tokenAddress =
      typeof token === "string" ? AztecAddress.fromString(token) : token;
    return tokens.find((t) => t.contract.address.equals(tokenAddress));
  }

  function getTokenSymbolOrAddress(token: AztecAddress) {
    return getToken(token)?.symbol ?? `Token (${token.toShortString()}`;
  }
  return {
    wallets: [alice, bob],
    poolContract,
    tokens,
    getToken,
    getTokenSymbolOrAddress,
  };
}

async function deployTokenCached(
  name: string,
  deployer: AccountWalletWithPrivateKey,
  initialBalances: { wallet: AccountWalletWithPrivateKey; amount: bigint }[],
  log: Log,
) {
  return await deployContractCached(
    name,
    (address) => TokenContract.at(address, deployer),
    async () => {
      log(`Deploying token ${name}...`);
      const token = await TokenContract.deploy(deployer, deployer.getAddress())
        .send()
        .deployed();
      log(`Minting tokens ${name}...`);
      await Promise.all(
        initialBalances.map(async ({ wallet, amount }) => {
          log(
            `Minting ${name} tokens to ${wallet.getAddress().toString()} ...`,
          );
          await mintPrivateRedeem(token, wallet, amount, log);
          log(
            `${amount} ${name} tokens were successfully minted and redeemed by ${wallet
              .getAddress()
              .toString()}`,
          );
        }),
      );
      return token;
    },
    log,
  );
}

const DEPLOYED_CONTRACT_CACHE_PREFIX = "deployed_contract_";
const getContractCacheKey = (name: string) =>
  `${DEPLOYED_CONTRACT_CACHE_PREFIX}${name}`;
export async function getContractCached<T>(
  name: string,
  connect: (address: AztecAddress) => Promise<T>,
  log = defaultLog,
) {
  const key = getContractCacheKey(name);
  const cachedAddress = storage.getItem(key);
  if (!cachedAddress) {
    return undefined;
  }
  try {
    const connected = await connect(AztecAddress.fromString(cachedAddress));
    log(`Using cached ${name}...`);
    return connected;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if (e?.message.includes("is not deployed")) {
      return undefined;
    }
    throw e;
  }
}

export async function deployContractCached<T extends { address: AztecAddress }>(
  name: string,
  connect: (address: AztecAddress) => Promise<T>,
  deploy: () => Promise<T>,
  log = defaultLog,
) {
  const cached = await getContractCached(name, connect, log);
  if (cached) {
    return cached;
  }
  log(`Deploying ${name}...`);
  const contract = await deploy();
  log(`Saving ${name} to cache...`);
  storage.setItem(getContractCacheKey(name), contract.address.toString());
  log("Done");
  return contract;
}

export function clearPoolContractCache() {
  clearContractCache(POOL_CACHE_NAME);
}

export function clearContractCache(name: string) {
  storage.removeItem(getContractCacheKey(name));
}

export function clearContractsCache() {
  for (const name of Object.keys(localStorage)) {
    if (name.startsWith(DEPLOYED_CONTRACT_CACHE_PREFIX)) {
      storage.removeItem(name);
    }
  }
}

async function approveTokenUnshield(
  token: TokenContract,
  wallet: AccountWalletWithPrivateKey,
  spenderAddress: AztecAddress,
  amount: bigint,
  nonce: Fr,
) {
  await approveAction(
    wallet,
    spenderAddress,
    token
      .withWallet(wallet)
      .methods.unshield(wallet.getAddress(), spenderAddress, amount, nonce)
      .request(),
  );
}

async function approveAction(
  wallet: AccountWalletWithPrivateKey,
  to: AztecAddress,
  request: FunctionCall,
) {
  await wallet.createAuthWitness(
    Fr.fromBuffer(computeAuthWitMessageHash(to, request)),
  );
}

async function redeemShield(
  token: TokenContract,
  txHash: TxHash,
  wallet: AccountWalletWithPrivateKey,
  amount: bigint,
  secret: Fr,
) {
  const secretHash = computeMessageSecretHash(secret);
  const note = new Note([new Fr(amount), secretHash]);
  await pxe.addNote(
    new ExtendedNote(
      note,
      wallet.getAddress(),
      token.address,
      pendingShieldsStorageSlot,
      txHash,
    ),
  );
  await token
    .withWallet(wallet)
    .methods.redeem_shield(wallet.getAddress(), amount, secret)
    .send()
    .wait();
}

async function mintPrivateRedeem(
  token: TokenContract,
  account: AccountWalletWithPrivateKey,
  amount: bigint,
  log: Log,
) {
  const secret = Fr.random();
  const secretHash = computeMessageSecretHash(secret);
  const receipt = await token.methods
    .mint_private(amount, secretHash)
    .send()
    .wait();
  await redeemShield(token, receipt.txHash, account, amount, secret);
  log(
    `minted and redeemed ${amount} tokens to ${account
      .getAddress()
      .toString()}`,
  );
}

export async function balanceOfPrivate(
  token: DeepPick<
    TokenContract,
    { withWallet: never; methods: { balance_of_private: never } }
  >,
  wallet: AccountWalletWithPrivateKey,
): Promise<bigint> {
  return await token
    .withWallet(wallet)
    .methods.balance_of_private(wallet.getAddress())
    .view();
}

export async function balanceOfPublic(
  token: TokenContract,
  address: AztecAddress,
): Promise<bigint> {
  return await token.methods.balance_of_public(address).view();
}

export async function addLiquidity(
  tokenA: TokenContract,
  tokenB: TokenContract,
  amountA: bigint,
  amountB: bigint,
  wallet: AccountWalletWithPrivateKey,
  log = defaultLog,
) {
  const [token0, token1] = sortTokens(tokenA, tokenB);
  const [amount0, amount1] = token0.address.equals(tokenA.address)
    ? [amountA, amountB]
    : [amountB, amountA];

  const nonce0 = Fr.random();
  const nonce1 = Fr.random();
  log("approving pool to spend tokens for liquidity...");
  await Promise.all([
    approveTokenUnshield(token0, wallet, poolContract.address, amount0, nonce0),
    approveTokenUnshield(token1, wallet, poolContract.address, amount1, nonce1),
  ]);

  log("adding liquidity...");
  const receipt = await poolContract
    .withWallet(wallet)
    .methods.add_liquidity(
      token0.address,
      token1.address,
      amount0,
      amount1,
      nonce0,
      nonce1,
    )
    .send()
    .wait();
  log("add liquidity tx hash:", receipt.txHash.toString());
}

export async function swap(
  swapInput: SwapInput,
  swapEstimate: SwapEstimate,
  wallet: AccountWalletWithPrivateKey,
  log = defaultLog,
) {
  if (!poolContract) {
    throw new Error("wait for the pool contract to be deployed");
  }
  log("preparing swap...");

  const [token0, token1] = sortTokens(swapInput.tokenIn, swapInput.tokenOut);
  const [amount0In, amount0Out, amount1In, amount1Out] =
    swapInput.tokenIn.address.equals(token0.address)
      ? [swapInput.amountIn, 0n, 0n, swapEstimate.amountOut]
      : [0n, swapEstimate.amountOut, swapInput.amountIn, 0n];

  log(`approving the pool to spend ${swapInput.amountIn} tokens for swap...`);

  const nonce0 = Fr.random();
  const nonce1 = Fr.random();
  if (amount0In > 0n) {
    await approveTokenUnshield(
      token0,
      wallet,
      poolContract.address,
      amount0In,
      nonce0,
    );
  }
  if (amount1In > 0n) {
    await approveTokenUnshield(
      token1,
      wallet,
      poolContract.address,
      amount1In,
      nonce1,
    );
  }
  const secret = Fr.random();
  const secretHash = computeMessageSecretHash(secret);
  log("secret:", secret.toString());
  log("secretHash:", secretHash.toString());
  log("swapping...");
  const receipt = await poolContract
    .withWallet(wallet)
    .methods.swap(
      token0.address,
      token1.address,
      amount0In,
      amount0Out,
      amount1In,
      amount1Out,
      nonce0,
      nonce1,
      secretHash,
    )
    .send()
    .wait();
  log("swap tx hash:", receipt.txHash.toString());
  log(`redeeming ${swapEstimate.amountOut}...`);
  if (amount0Out > 0n) {
    await redeemShield(token0, receipt.txHash, wallet, amount0Out, secret);
  }
  if (amount1Out > 0n) {
    await redeemShield(token1, receipt.txHash, wallet, amount1Out, secret);
  }
  log("redeemed");
}

export type SwapInput = {
  tokenIn: TokenContract;
  tokenOut: TokenContract;
  amountIn: bigint;
};

export type SwapEstimate = {
  amountOut: bigint;
};

export async function estimateSwap(
  { tokenIn, tokenOut, amountIn }: SwapInput,
  log = defaultLog,
): Promise<SwapEstimate> {
  const [reserveIn, reserveOut] = await getReserves(tokenIn, tokenOut);
  log("reserves", reserveIn, reserveOut);
  const amountOut = (reserveOut * amountIn) / (reserveIn + amountIn);
  log("amountIn", amountIn, "amountOut", amountOut);
  return {
    amountOut,
  };
}

export async function getReserves(
  tokenA: TokenContract,
  tokenB: TokenContract,
) {
  const {
    tokens: [token0, token1],
    reserves: [reserve0, reserve1],
  } = await getTokensAndReserves();

  if (token0.equals(tokenA.address)) {
    assert(token1.equals(tokenB.address), "invalid tokenB 1");
    return [reserve0, reserve1] as const;
  }
  assert(token0.equals(tokenB.address), "invalid tokenB 2");
  assert(token1.equals(tokenA.address), "invalid tokenA 2");
  return [reserve1, reserve0] as const;
}

export async function getTokens(): Promise<[AztecAddress, AztecAddress]> {
  const [token0, token1] = await poolContract.methods
    .tokens()
    .view()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then((tokens: any[]) =>
      tokens.map((t) => AztecAddress.fromBigInt(t.address)),
    );
  return [token0, token1];
}

export async function getTokensAndReserves() {
  const {
    tokens: [token0, token1],
    reserves,
  } = await ethers.utils.resolveProperties({
    tokens: getTokens(),
    reserves: poolContract.methods.reserves().view(),
  });
  const [reserve0, reserve1] = reserves as bigint[];
  return {
    tokens: [token0, token1] as const,
    reserves: [reserve0, reserve1] as const,
  };
}

export function sortTokens(tokenA: TokenContract, tokenB: TokenContract) {
  if (
    tokenA.address.toString().toLowerCase() >
    tokenB.address.toString().toLowerCase()
  ) {
    return [tokenB, tokenA] as const;
  }
  return [tokenA, tokenB] as const;
}

type Log = (...args: unknown[]) => void;
