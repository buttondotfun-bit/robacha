import "server-only";
import type { Address, PublicClient } from "viem";
import { ROBACHA_GACHA_ABI } from "@/lib/abi";
import { contracts } from "@/lib/config";

/**
 * Which randomness adapter is actually wired, asked of the gacha.
 *
 * There is a `NEXT_PUBLIC_ROBACHA_RANDOMNESS_SENDER_ADDRESS` env var, and for
 * a while everything read it. That works exactly until the adapter is
 * replaced, which has now happened three times — and the env var is the one
 * step in the swap that lives outside the transaction, so it is the step that
 * gets missed. It was missed on the last one: the gacha moved to the new
 * adapter, the old one was drained to zero, and configuration kept pointing at
 * the empty contract.
 *
 * Nothing broke loudly, which is the bad part. Spins kept working, because the
 * lifecycle calls go to the gacha. What broke was every read-only view of the
 * machine — including the monitor, which read zero runway off a dead contract
 * and cried critical while the live float held thirty-four rounds. An alarm
 * that fires on the wrong contract is worse than no alarm: it is loud, it is
 * wrong, and the next real one is indistinguishable from it.
 *
 * The gacha is the only authority on this. It is what routes the request, so
 * whatever it names is the adapter serving players, by definition, and it
 * cannot drift from itself. Same reasoning as `randomnessTreasury` in
 * `entropy-float.ts`: read the pointer from the contract that honours it.
 *
 * Config stays as a fallback for the case where the chain read fails, so a
 * flaky RPC degrades to a possibly-stale answer rather than to none.
 */
export async function activeRandomnessAdapter(
  client: PublicClient,
): Promise<Address | null> {
  return readPointer(client, "randomnessSender", contracts.randomnessSender);
}

/**
 * Who the gacha hands the delivered word to.
 *
 * The same contract as the sender in every deployment so far, which is exactly
 * why it is read rather than assumed: they are two independent setters, a swap
 * that moves one and not the other is a live half-migration, and a view that
 * infers the second from the first would render that as healthy.
 */
export async function activeRandomnessReceiver(
  client: PublicClient,
): Promise<Address | null> {
  return readPointer(client, "randomnessReceiver", contracts.randomnessReceiver);
}

async function readPointer(
  client: PublicClient,
  functionName: "randomnessSender" | "randomnessReceiver",
  fallback: Address | null | undefined,
): Promise<Address | null> {
  const gacha = contracts.gacha;
  if (!gacha) return fallback ?? null;

  const onChain = await client
    .readContract({ address: gacha, abi: ROBACHA_GACHA_ABI, functionName })
    .catch(() => null);

  if (
    typeof onChain === "string" &&
    onChain !== "0x0000000000000000000000000000000000000000"
  ) {
    return onChain as Address;
  }

  return fallback ?? null;
}
