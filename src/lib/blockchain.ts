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
import type { DeepPick } from "ts-essentials";
import { AmmContract } from "../contracts/amm/--compiler/Amm";

const PXE_URL = "http://localhost:8080";

const defaultLog = console.log.bind(console);

const pendingShieldsStorageSlot = new Fr(5);

let ammContract: AmmContract;
let pxe: PXE;
export type Blockchain = Awaited<ReturnType<typeof setupBlockchain>>;
export async function setupBlockchain(log: Log) {
  await init();
  pxe = createPXEClient(PXE_URL);
  await waitForSandbox(pxe);

  // The sandbox comes with a set of created accounts. Load them
  const wallets = (await getSandboxAccountsWallets(pxe)).slice(0, 2);

  const deployer = wallets[0];

  const { wethToken, daiToken } = await ethers.utils.resolveProperties({
    wethToken: deployTokenCached(
      "weth",
      deployer,
      [
        { wallet: wallets[0], amount: 100n },
        { wallet: wallets[1], amount: 20n },
      ],
      log,
    ),
    daiToken: deployTokenCached(
      "dai",
      deployer,
      [
        { wallet: wallets[0], amount: 30_000n },
        { wallet: wallets[1], amount: 50_000n },
      ],
      log,
    ),
  });

  ammContract = await deployContractCached(
    "amm",
    (address) => AmmContract.at(address, deployer),
    async () => {
      log(`Deploying AMM...`);
      const [token0, token1] = sortTokens(wethToken, daiToken);
      ammContract = await AmmContract.deploy(
        deployer,
        deployer.getAddress(),
        token0.address,
        token1.address,
      )
        .send()
        .deployed();
      await printBalances();
      {
        const addLiquidityAmount0 = 1000n;
        const addLiquidityAmount1 = 23n;
        const nonce0 = Fr.random();
        const nonce1 = Fr.random();
        log("approving AMM to spend tokens...");
        await approve(
          deployer,
          ammContract.address,
          token0.methods
            .unshield(
              deployer.getAddress(),
              ammContract.address,
              addLiquidityAmount0,
              nonce0,
            )
            .request(),
        );
        await approve(
          deployer,
          ammContract.address,
          token1.methods
            .unshield(
              deployer.getAddress(),
              ammContract.address,
              addLiquidityAmount1,
              nonce1,
            )
            .request(),
        );
        log("adding liquidity...");
        const receipt = await ammContract.methods
          .add_liquidity(
            token0.address,
            token1.address,
            addLiquidityAmount0,
            addLiquidityAmount1,
            nonce0,
            nonce1,
          )
          .send()
          .wait();
        log("add_liquidity tx hash:", receipt.txHash.toString());
        await printBalances();
        return ammContract;
      }
    },
    log,
  );
  log(`AMM: ${ammContract.address.toString()}`);

  async function printBalances() {
    for (const [tokenName, token] of Object.entries({ wethToken, daiToken })) {
      console.log(`${tokenName} balances:`);
      for (const [name, wallet] of Object.entries({
        alice: wallets[0],
        bob: wallets[1],
        ammContract,
      })) {
        const address =
          "address" in wallet ? wallet.address : wallet.getAddress();
        console.log(
          `${name} balance`,
          "getAddress" in wallet
            ? await balanceOfPrivate(token as any, wallet)
            : "N/D",
          "+",
          await balanceOfPublic(token, address),
        );
      }
      console.log();
    }
  }

  return {
    wallets,
    tokens: [
      { name: "WETH", contract: wethToken },
      { name: "DAI", contract: daiToken },
    ],
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
async function deployContractCached<T extends { address: AztecAddress }>(
  name: string,
  connect: (address: AztecAddress) => Promise<T>,
  deploy: () => Promise<T>,
  log: Log,
) {
  name = `${DEPLOYED_CONTRACT_CACHE_PREFIX}${name}`;
  const cachedAddress = localStorage.getItem(name);
  if (cachedAddress) {
    log(`Using cached ${name}...`);
    return connect(AztecAddress.fromString(cachedAddress));
  }
  log(`Deploying ${name}...`);
  const contract = await deploy();
  log(`Saving ${name} to cache...`);
  localStorage.setItem(name, contract.address.toString());
  log("Done");
  return contract;
}

export async function clearContractsCache() {
  for (const name of Object.keys(localStorage)) {
    if (name.startsWith(DEPLOYED_CONTRACT_CACHE_PREFIX)) {
      localStorage.removeItem(name);
    }
  }
}

async function approve(
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
) {
  return token
    .withWallet(wallet)
    .methods.balance_of_private(wallet.getAddress())
    .view();
}

export async function balanceOfPublic(token: any, address: AztecAddress) {
  if ("methods" in token && "balance_of_public" in token.methods) {
    return token.methods.balance_of_public(address).view();
  }
  return "N/A";
}

export async function swap(
  swapInput: SwapInput,
  swapEstimate: SwapEstimate,
  wallet: AccountWalletWithPrivateKey,
  log: Log = defaultLog,
) {
  if (!ammContract) {
    throw new Error("wait for AMM contract to be deployed");
  }
  log("swapping...");

  const nonce = Fr.random();

  log("approving AMM to spend tokens...");
  await approve(
    wallet,
    ammContract.address,
    swapInput.tokenIn
      .withWallet(wallet)
      .methods.unshield(
        wallet.getAddress(),
        ammContract.address,
        swapInput.amountIn,
        nonce,
      )
      .request(),
  );
  const secret = Fr.random();
  const secretHash = computeMessageSecretHash(secret);
  log("secret:", secret.toString());
  log("secretHash:", secretHash.toString());
  log("swapping...");
  const receipt = await ammContract
    .withWallet(wallet)
    .methods.swap(
      swapInput.tokenIn.address,
      swapInput.tokenOut.address,
      swapInput.amountIn,
      swapEstimate.amountOut,
      secretHash,
      nonce,
    )
    .send()
    .wait();
  log("swap tx hash:", receipt.txHash.toString());
  log(`redeeming ${swapEstimate.amountOut}...`);
  await redeemShield(
    swapInput.tokenOut,
    receipt.txHash,
    wallet,
    swapEstimate.amountOut,
    secret,
  );
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
  log: Log = defaultLog,
): Promise<SwapEstimate> {
  const [reserve0, reserve1] = await ammContract.methods.get_reserves().view();
  log("reserves", reserve0, reserve1);
  const [token0] = sortTokens(tokenIn, tokenOut);
  const [reserveIn, reserveOut] = tokenIn.address.equals(token0.address)
    ? [reserve0, reserve1]
    : [reserve1, reserve0];
  const amountOut = (reserveOut * amountIn) / (reserveIn + amountIn);
  log("amountIn", amountIn.toString(), "amountOut", amountOut.toString());
  return {
    amountOut,
  };
}

function sortTokens(tokenA: TokenContract, tokenB: TokenContract) {
  const a = toU120(tokenA.address);
  const b = toU120(tokenB.address);
  if (a > b) {
    return [tokenB, tokenA] as const;
  }
  return [tokenA, tokenB] as const;
}

function toU120(x: { toString(): string }) {
  // IDK if this is correct slicing but seems to work
  return ethers.utils.hexDataSlice(x.toString().toLowerCase(), 17, 32);
}

type Log = (...args: any[]) => void;
