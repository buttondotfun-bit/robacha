export interface FaqGroup {
  id: string;
  title: string;
  description: string;
  items: { question: string; answer: string }[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "What ROBACHA is and how to take a first spin.",
    items: [
      {
        question: "What is ROBACHA?",
        answer:
          "ROBACHA is a memecoin gacha built for Robinhood Chain. You buy a spin, and the pool sends back a random token reward from the tokens currently stocked in that rotation. It is a discovery product — the point is to find ecosystem tokens you would not have gone looking for.",
      },
      {
        question: "How does a spin work?",
        answer:
          "A spin draws one rarity band using the published probabilities, then picks a token within that band using its weight, then picks a quantity inside that token's reward range. Each spin is independent — previous results do not change the odds of the next one.",
      },
      {
        question: "Do I need to spin more than once?",
        answer:
          "No. One spin returns one reward. You can queue up to ten spins at a time for convenience, but each is drawn separately against the same odds.",
      },
      {
        question: "Is there a cost to spin?",
        answer:
          "Each spin has a listed price shown in the spin panel before you confirm, plus the Robinhood Chain network fee for the transaction. Both are displayed before you commit.",
      },
    ],
  },
  {
    id: "spins-and-rewards",
    title: "Spins and Rewards",
    description: "Rarity, odds and what actually arrives in your wallet.",
    items: [
      {
        question: "Which tokens can I receive?",
        answer:
          "Whatever is stocked in the current rotation. The full list, with each token's rarity, reward range, odds and pool allocation, is on the Rewards page — you can read it before spending anything.",
      },
      {
        question: "Are the odds visible?",
        answer:
          "Yes. Band probabilities sit at the top of the app and on every tier card, and per-token odds appear on each reward card and in its detail view. The same numbers drive the draw itself.",
      },
      {
        question: "What do the rarity bands mean?",
        answer:
          "Rarity describes how scarce a reward is within the pool, and generally tracks the size of the reward. Common is the most frequent band; Legendary is the least. Rarity does not affect whether you receive a reward — every spin returns one.",
      },
      {
        question: "Can a token appear in more than one band?",
        answer:
          "No. Each token sits in exactly one rarity band for the duration of a rotation. A token can move between bands when a new rotation opens.",
      },
    ],
  },
  {
    id: "wallets-and-claims",
    title: "Wallets and Claims",
    description: "Connecting, claiming and where rewards are held.",
    items: [
      {
        question: "How do I claim a reward?",
        answer:
          "Rewards land in My Bag as soon as a spin resolves. Claiming moves them to your wallet — claim one at a time from the reward row, or use Claim All to settle everything unclaimed in one action.",
      },
      {
        question: "Which wallets are supported?",
        answer:
          "Any injected browser wallet that supports Robinhood Chain. Additional connection methods can be added as the ecosystem's wallet support matures.",
      },
      {
        question: "What happens if I disconnect before claiming?",
        answer:
          "Unclaimed rewards stay associated with the wallet that won them. Reconnecting the same wallet brings them back into My Bag.",
      },
      {
        question: "Is there a deadline to claim?",
        answer:
          "There is no claim deadline planned for the initial release. If that changes, any window would be shown on the reward row well before it applies.",
      },
    ],
  },
  {
    id: "reward-pools",
    title: "Reward Pools",
    description: "How rotations are built and refreshed.",
    items: [
      {
        question: "How often are reward pools updated?",
        answer:
          "Pools rotate on a schedule, and the countdown to the next rotation is shown in the app and on the Rewards page. Tokens can be added or removed at rotation boundaries rather than mid-pool.",
      },
      {
        question: "How are tokens chosen for a pool?",
        answer:
          "A mix of trending ecosystem tokens, community-selected entries and sponsored slots. Sponsorship affects which tokens are stocked — it does not change the disclosed odds of the band a token sits in.",
      },
      {
        question: "What does pool allocation mean?",
        answer:
          "The share of pool inventory reserved for that token. Inventory is stocked in proportion to draw odds, so allocation and odds track each other closely.",
      },
      {
        question: "What happens when a pool runs out of a token?",
        answer:
          "Inventory is sized against expected draw volume for the rotation. If a token is exhausted early, it is removed from the pool and the remaining probabilities are republished before further spins.",
      },
    ],
  },
  {
    id: "robinhood-chain",
    title: "Robinhood Chain",
    description: "The network ROBACHA is built on.",
    items: [
      {
        question: "Is ROBACHA built on Robinhood Chain?",
        answer:
          "Yes. ROBACHA is designed as a Robinhood Chain-native product — spins, reward inventory and claims are all intended to settle on that chain.",
      },
      {
        question: "Is ROBACHA affiliated with Robinhood?",
        answer:
          "No. ROBACHA is an independent project built for Robinhood Chain. It is not owned, endorsed or operated by Robinhood, and nothing in the product should be read as implying otherwise.",
      },
      {
        question: "Do I need a specific network configured?",
        answer:
          "Your wallet needs Robinhood Chain selected. If it is on another network, the app shows a switch prompt rather than letting a spin proceed against the wrong chain.",
      },
    ],
  },
  {
    id: "risk-and-transparency",
    title: "Risk and Transparency",
    description: "What this build does today, and what it does not.",
    items: [
      {
        question: "Is ROBACHA live?",
        answer:
          "The pool is live: every reward token, contract, price and set of odds you see is read from Robinhood Chain mainnet, and connecting a wallet reads your real balances. Spins themselves open when the gacha contract is deployed — until then the spin button is disabled rather than simulating a result.",
      },
      {
        question: "Is the randomness verifiable?",
        answer:
          "Randomness is settled on chain as part of the spin transaction, so a draw cannot be influenced by the frontend. The randomness source is named in the pool transparency panel, and no spin can be submitted until that contract is live.",
      },
      {
        question: "Are the contracts audited?",
        answer:
          "The gacha and reward vault contracts are not deployed yet, so there is nothing audited to point to. The transparency panel shows contract status and will carry the address and audit references as soon as they exist.",
      },
      {
        question: "What are the risks?",
        answer:
          "Token rewards can fall in value, sometimes sharply, and some tokens may become illiquid — you can check any reward's live price and liquidity on the Rewards page before you spin. Smart-contract risk applies once contracts are live. Spending on spins should be treated as spending, not investing — see the Risk Disclosure for the full statement.",
      },
    ],
  },
];

/** Short set used on the landing page. */
export const FAQ_PREVIEW = [
  FAQ_GROUPS[0].items[0],
  FAQ_GROUPS[0].items[1],
  FAQ_GROUPS[1].items[0],
  FAQ_GROUPS[1].items[1],
  FAQ_GROUPS[2].items[0],
  FAQ_GROUPS[4].items[0],
  FAQ_GROUPS[3].items[0],
];
