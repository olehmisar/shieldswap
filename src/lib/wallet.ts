import type { AccountWalletWithPrivateKey } from "@aztec/aztec.js";
import { writable } from "svelte/store";

export const wallet = writable<AccountWalletWithPrivateKey>();
