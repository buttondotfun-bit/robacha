import type { Address } from "viem";
import { ROB_TOKEN_ADDRESS } from "@/data/rob-token";

/**
 * Paying for a spin in $ROB, without changing the gacha.
 *
 * The gacha's `spin` is ETH-only and credits `msg.sender`, so a router that
 * swapped ROB and called `spin` would become the entrant and win the prize
 * itself. The only way to let a player pay in ROB and still receive the prize
 * is for the player's own wallet to do both: swap ROB to exactly the ETH the
 * spin costs, then spin. Two signatures, the player stays `msg.sender`, and no
 * contract is deployed or migrated. Verified end-to-end on a fork: 6,582 ROB
 * bought exactly 0.0007 ETH and the following spin credited the player.
 *
 * The swap is `exactOutput`, not `exactInput`, on purpose. The spin reverts
 * unless `msg.value` is exactly (base + surcharge) × quantity, so the player
 * needs precisely that much ETH and not a wei more — `exactOutput` lands the
 * exact figure and pulls only the ROB it takes, refunding nothing because it
 * never over-pulls. `exactInput` would leave ETH dust that fails the spin's
 * equality check.
 *
 * Everything here is the ROB market the AutoBuyer already trades: the Gekko V3
 * ROB/WETH pool at the 1% tier, reached through its SwapRouter02.
 */

/** Re-exported from the canonical descriptor so the address lives in one place. */
export const ROB_TOKEN: Address = ROB_TOKEN_ADDRESS;
export const WETH_TOKEN: Address = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
export const ROB_WETH_POOL: Address = "0x1490b8cB62e567F862DeC48E4C100e2DBFb10092";
/** Gekko's SwapRouter02 — the same router the AutoBuyer uses for ROB. */
export const SWAP_ROUTER: Address = "0xCaf681a66D020601342297493863E78C959E5cb2";
/** The ROB/WETH pool's fee tier. ROB does not exist at any other tier. */
export const ROB_POOL_FEE = 10_000;

/**
 * How much more ROB than the spot estimate the player authorises.
 *
 * `exactOutput` only pulls what the swap actually costs, so this is a ceiling,
 * not a spend — its whole job is to survive the price moving between the quote
 * and the signature without the swap reverting. Wide enough for a 1% pool plus
 * a block or two of drift; the player is shown the estimate, not this.
 */
export const ROB_MAX_SLIPPAGE_BPS = 800n; // 8%

export const SWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "exactOutputSingle",
    stateMutability: "payable",
    inputs: [
      {
        type: "tuple",
        name: "params",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountOut", type: "uint256" },
          { name: "amountInMaximum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountIn", type: "uint256" }],
  },
  {
    type: "function",
    name: "unwrapWETH9",
    stateMutability: "payable",
    inputs: [
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "multicall",
    stateMutability: "payable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
] as const;

export const V3_POOL_SLOT0_ABI = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
] as const;

/**
 * Spot estimate of the ROB needed to buy `ethOut` wei, from the pool price.
 *
 * WETH is token0 in this pool, so (sqrtP / 2^96)² is ROB-per-WETH directly and
 * needs no inversion. This is spot: it ignores the 1% fee and the price impact
 * of the trade, both of which push the real cost up, which is exactly why the
 * caller pads it with `ROB_MAX_SLIPPAGE_BPS` before authorising. The number
 * shown to the player is this estimate, labelled as one.
 *
 * Staged through two shifts rather than squaring `sqrtPriceX96` outright, which
 * overflows uint256 for any realistic price — the same guard the publish
 * script's V3 pricing uses.
 */
export function estimateRobForEth(ethOut: bigint, sqrtPriceX96: bigint): bigint {
  if (sqrtPriceX96 === 0n) return 0n;
  const Q96 = 1n << 96n;
  const robPerWethScaled = (sqrtPriceX96 * sqrtPriceX96) >> 96n; // ROB per WETH, ×2^96
  return (ethOut * robPerWethScaled) / Q96;
}
