/**
 * Documentation content.
 *
 * Everything here describes what the contracts and the app actually do. Where
 * a behaviour is not built yet it is listed as not built, not omitted — a docs
 * page that quietly skips the gaps is worse than no docs page.
 */

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: { title: string; text: string }[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "note"; tone: "info" | "warn"; text: string }
  | { kind: "code"; text: string };

export interface DocSection {
  id: string;
  title: string;
  summary: string;
  blocks: DocBlock[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Overview",
    summary: "What ROBACHA is, and the guarantees it makes.",
    blocks: [
      {
        kind: "p",
        text: "ROBACHA is a memecoin gacha built for Robinhood Chain. You pay for a spin, the contract draws a reward from a funded pool using verifiable randomness, and the reward settles to your wallet as an ordinary ERC-20 transfer.",
      },
      {
        kind: "p",
        text: "Three properties hold at all times, and the rest of this page explains how each is enforced in code rather than by policy:",
      },
      {
        kind: "list",
        items: [
          "Odds are published on chain before you pay, and cannot change for a pool that has already sold a spin.",
          "Rewards come from inventory deposited in advance. A pool cannot open unless every reward it can pay is already funded.",
          "No operator — including the administrator — can choose your result, supply the randomness, or replace it.",
        ],
      },
      {
        kind: "note",
        tone: "info",
        text: "The interface reads every figure it shows from chain state. When a dependency cannot answer, it says so and disables the action rather than displaying a plausible-looking number.",
      },
    ],
  },
  {
    id: "spin-lifecycle",
    title: "How a spin resolves",
    summary: "Spins settle in batched rounds, not one transaction at a time.",
    blocks: [
      {
        kind: "p",
        text: "Requesting cross-chain randomness for every individual spin would cost more than most spins are worth. Instead, entries collect into a round, and one random word settles the whole round.",
      },
      {
        kind: "steps",
        items: [
          {
            title: "You enter",
            text: "Your payment is escrowed by the gacha contract and your entries are appended to the open round. No reward is chosen here — the outcome does not exist yet, so nothing about your transaction can influence it.",
          },
          {
            title: "The round closes",
            text: "A round closes when it fills or when its time window ends, whichever comes first. After that no entry can be added, so the set of entries a random word will settle is fixed before the word is ever requested.",
          },
          {
            title: "Randomness is requested",
            text: "Anyone can trigger the request — it is not a privileged action, so a round cannot be stranded by an operator failing to act. The request travels to Ethereum over Chainlink CCIP.",
          },
          {
            title: "The word returns",
            text: "Chainlink VRF produces one random word on Ethereum and it returns over CCIP. Only the authorised receiver contract can deliver it, and only once per round.",
          },
          {
            title: "Entries settle",
            text: "Each entry derives its own result from that word, and the reward is reserved against vault inventory. Settlement is batched so a full round can never exceed the block gas limit.",
          },
          {
            title: "You claim",
            text: "Your reward sits assigned to your address until you claim it. Claiming is a separate transaction that transfers the tokens to you.",
          },
        ],
      },
      {
        kind: "note",
        tone: "info",
        text: "Nothing in this flow advances on a timer. Every state change follows a wallet response, an RPC response, a confirmed receipt, or an on-chain event.",
      },
    ],
  },
  {
    id: "randomness",
    title: "Randomness",
    summary: "Chainlink VRF on Ethereum, delivered over CCIP. No fallback exists.",
    blocks: [
      {
        kind: "p",
        text: "Robinhood Chain has no native VRF, and every on-chain value available locally is either predictable by a participant or choosable by a block producer. Rather than accept a weaker source, ROBACHA sources randomness from Ethereum and bridges it:",
      },
      {
        kind: "code",
        text: `RobachaGacha
  → RobachaRandomnessSender        (Robinhood Chain)
  → Chainlink CCIP
  → EthereumRobachaRandomnessCoordinator
  → Chainlink VRF v2.5             (Ethereum)
  → Chainlink CCIP
  → RobachaRandomnessReceiver      (Robinhood Chain)
  → settlement`,
      },
      {
        kind: "p",
        text: "One VRF word settles an entire round. Each entry's own result is derived from that word by domain-separated hashing, bound to values that make two entries mathematically unable to share a result:",
      },
      {
        kind: "code",
        text: `seed = keccak256(abi.encode(
    randomWord, block.chainid, poolId,
    version, roundId, entryIndex, entrant
))`,
      },
      {
        kind: "p",
        text: "The tier, the reward slot within that tier, and the amount are each drawn from separately-tagged hashes of that seed, so they cannot be correlated with one another.",
      },
      {
        kind: "p",
        text: "None of the following is used anywhere, alone or combined:",
      },
      {
        kind: "list",
        items: [
          "block.timestamp, block.prevrandao, block.difficulty or blockhash",
          "the L2 block number",
          "user-supplied entropy",
          "any value chosen off-chain by ROBACHA or an operator",
          "browser or JavaScript randomness",
        ],
      },
      {
        kind: "note",
        tone: "warn",
        text: "If the randomness path is not configured and funded, spins stay closed. The contract reports this and the interface disables the action. It never silently substitutes a weaker source.",
      },
      {
        kind: "p",
        text: "Every layer of the return path is validated before a word is accepted: the CCIP router must be the caller, the source chain selector must match, the sending contract must be the authorised coordinator, the message must not have been seen before, and the round must not already be fulfilled. The gacha then checks the request id independently.",
      },
    ],
  },
  {
    id: "odds",
    title: "Odds and rarity",
    summary: "Tier probabilities are stored on chain in basis points and total exactly 10,000.",
    blocks: [
      {
        kind: "p",
        text: "A pool defines tiers, each with a probability in basis points. The registry refuses to configure or activate a pool whose tiers do not total exactly 10,000 bps — there is no rounding slack and no implicit remainder tier.",
      },
      {
        kind: "p",
        text: "Each tier holds one or more reward slots. A draw picks a tier by its published probability, then picks a slot uniformly within that tier. So a slot's absolute odds are its tier's probability divided by the number of slots sharing that tier.",
      },
      {
        kind: "table",
        head: ["Term", "Meaning"],
        rows: [
          ["Tier probability", "The published chance of landing in that band, in basis points"],
          ["Reward slot", "One token with a minimum and maximum reward amount"],
          ["Slot odds", "Tier probability ÷ number of slots in that tier"],
          ["Amount", "Drawn uniformly between the slot's published minimum and maximum"],
        ],
      },
      {
        kind: "p",
        text: "Rarity names — common through legendary — are a presentation label, not pool data. The contract only knows probabilities. The interface ranks tiers by probability and labels the scarcest as legendary, so a pool with fewer than five tiers still reads sensibly.",
      },
      {
        kind: "note",
        tone: "info",
        text: "Once a pool version takes its first paid spin it is locked. Probabilities, reward amounts, spin price, fee split and randomness method all become immutable for that version. Changing any of them requires publishing a new version.",
      },
    ],
  },
  {
    id: "rewards",
    title: "Rewards and the vault",
    summary: "Inventory is deposited in advance and can never be over-promised.",
    blocks: [
      {
        kind: "p",
        text: "Reward tokens live in the reward vault, which tracks what it holds against what it owes. The core invariant is enforced on every state change:",
      },
      { kind: "code", text: "reserved[token] <= IERC20(token).balanceOf(vault)" },
      {
        kind: "p",
        text: "When a spin settles, the reward is reserved against free inventory. The vault refuses to reserve beyond its own balance, so the gacha can never promise a reward the vault cannot pay.",
      },
      {
        kind: "p",
        text: "A pool cannot be activated unless every reward slot is funded to at least its own maximum, so any single winning draw is payable at the moment the pool opens.",
      },
      {
        kind: "p",
        text: "Non-standard tokens are rejected rather than accommodated:",
      },
      {
        kind: "list",
        items: [
          "Fee-on-transfer tokens cannot be deposited — the vault measures the balance delta and reverts if it differs from the stated amount.",
          "Rebasing tokens are detected by tracking deposits net of payouts; drift below that figure marks the token unhealthy and blocks activation.",
          "Withdrawing surplus can never touch inventory reserved against an unclaimed reward.",
        ],
      },
      {
        kind: "note",
        tone: "warn",
        text: "If a settling entry finds nothing in the pool that can pay it, that entry is refunded in full rather than silently downgraded to a smaller reward.",
      },
    ],
  },
  {
    id: "claims-refunds",
    title: "Claims, timeouts and refunds",
    summary: "What happens when things go right, and when they do not.",
    blocks: [
      {
        kind: "p",
        text: "An assigned reward stays yours until you claim it. Claiming transfers the tokens and marks the reward claimed; a second attempt reverts, and no address other than the owner can claim it.",
      },
      {
        kind: "p",
        text: "Claims stay open while spins are paused. Pausing stops new entries — it does not withhold a reward you have already been assigned.",
      },
      {
        kind: "p",
        text: "If randomness never arrives, the round becomes refundable after a timeout. Anyone can trigger that transition once the timeout has elapsed; no administrator can trigger it early, and none can substitute a result instead.",
      },
      {
        kind: "p",
        text: "Refunds return what the round still holds. The randomness request is paid out of the surcharge, never the base price, so the base price is always fully covered. Any shortfall in the surcharge is divided evenly across participants to the wei, rather than falling entirely on whoever is last in the list.",
      },
    ],
  },
  {
    id: "fees",
    title: "Fees and pricing",
    summary: "What you pay, where it goes, and what can change.",
    blocks: [
      {
        kind: "p",
        text: "A spin costs a base price plus a randomness surcharge. They are quoted separately in the interface before you are asked to sign, and they are accounted separately on chain.",
      },
      {
        kind: "table",
        head: ["Component", "Share of base price", "Cap"],
        rows: [
          ["Reward reserve", "85.00%", "—"],
          ["Protocol", "12.00%", "20% hard cap"],
          ["Operations", "3.00%", "5% hard cap"],
        ],
      },
      {
        kind: "p",
        text: "The three components must total exactly 10,000 basis points, checked when a change is proposed and again when it is executed. Changes sit behind a 48-hour timelock and emit events at both proposal and execution.",
      },
      {
        kind: "p",
        text: "A pool version snapshots the split when it is created, so a fee change can never alter the economics of a pool that is already selling spins. It applies only to future versions.",
      },
      {
        kind: "note",
        tone: "info",
        text: "The randomness surcharge is not protocol revenue. It pays the real Chainlink CCIP and VRF costs of the round, is routed to a separate funding account, and is displayed apart from the base price.",
      },
    ],
  },
  {
    id: "security",
    title: "Security model",
    summary: "What privilege exists, and what it cannot reach.",
    blocks: [
      {
        kind: "p",
        text: "Privilege is split across distinct roles rather than concentrated in one owner: pool management, pausing, treasury withdrawal, vault management, randomness delivery, and the gacha's own routing role.",
      },
      { kind: "p", text: "What an administrator can do:" },
      {
        kind: "list",
        items: [
          "Create and activate a pool version, or close one",
          "Pause and unpause spins",
          "Deposit reward inventory, and withdraw genuinely unreserved surplus",
          "Withdraw accrued protocol revenue to the treasury it accrued for",
          "Propose a fee change, subject to the caps and the 48-hour timelock",
        ],
      },
      { kind: "p", text: "What an administrator cannot do, by construction:" },
      {
        kind: "list",
        items: [
          "Supply, replace or influence a random word",
          "Choose or alter any spin's result",
          "Change probabilities, amounts or price on a pool that has taken a paid spin",
          "Withdraw inventory reserved against an unclaimed reward",
          "Redirect accrued revenue to an address other than the one it accrued for",
          "Mark a round refundable before its timeout has elapsed",
        ],
      },
    ],
  },
  {
    id: "status",
    title: "Current status and limits",
    summary: "What is built, what is not, and what has not been reviewed.",
    blocks: [
      { kind: "p", text: "Built and running:" },
      {
        kind: "list",
        items: [
          "All contracts deployed and source-verified on Robinhood Chain",
          "Cross-chain randomness configured and funded on both chains",
          "Frontend reading pool, odds, inventory and wallet state directly from chain",
          "Activity and wallet rewards served from confirmed contract logs and reads",
        ],
      },
      { kind: "p", text: "Not built yet:" },
      {
        kind: "list",
        items: [
          "Database-backed event indexer — activity currently covers a recent block window only, and full history is unavailable",
          "Administration application — pool operations are performed by direct contract calls",
          "Automated market-data validation of pool economics before activation",
          "Age gate, terms acceptance capture, geofencing and self-exclusion controls",
        ],
      },
      {
        kind: "p",
        text: "Public paid spins are disabled by default and require the operator to enable them deliberately, on top of the contract's own pause and readiness checks.",
      },
    ],
  },
  {
    id: "risk",
    title: "Risk and eligibility",
    summary: "Read this before participating.",
    blocks: [
      {
        kind: "p",
        text: "ROBACHA is a paid, chance-based token-reward product. You pay a known price for a draw whose outcome is not known in advance and is not guaranteed to be worth what you paid.",
      },
      {
        kind: "list",
        items: [
          "Token rewards fluctuate in value and can lose value entirely.",
          "Published probabilities apply to every entry independently. Past results do not influence future ones.",
          "Nothing here is financial, investment, tax or legal advice, and no outcome is guaranteed.",
          "A paid chance-based product may be regulated differently across jurisdictions. Availability may be restricted.",
        ],
      },
      {
        kind: "note",
        tone: "info",
        text: "\"Rob the Gacha\" is brand language for pulling a reward from a funded, published pool. Rewards come from inventory deposited in advance by the operator or a sponsor. Nothing is taken from another participant.",
      },
    ],
  },
];
