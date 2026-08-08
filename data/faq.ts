export interface FaqGroup {
  id: string;
  title: string;
  description: string;
  items: { question: string; answer: string }[];
}

/**
 * Plain-language answers, written to match what the contracts actually do.
 *
 * Two rules when editing these. Keep the language ordinary — someone who has
 * never touched a wallet should follow every answer. And keep them true to the
 * deployed system: a spin resolves after its round closes, not in the spin
 * transaction; a pool's odds and prizes are frozen once it starts selling; an
 * underfunded prize is refunded rather than paid short. If the contracts
 * change, these change with them.
 */
export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "What this is, and how to take your first spin.",
    items: [
      {
        question: "What is ROBACHA?",
        answer:
          "It's a capsule machine for memecoins, built on Robinhood Chain. You pay for a spin and get a random token back from whatever's loaded in the machine. The point is to turn up coins you'd never have gone looking for.",
      },
      {
        question: "How does a spin work?",
        answer:
          "Three steps. It picks a rarity — common, rare or legendary — using the odds shown on screen. Then it picks one of the prizes in that rarity. Then it picks how much you get, somewhere inside that prize's range. Every spin stands on its own: what happened last time doesn't change your chances this time.",
      },
      {
        question: "How many spins can I buy at once?",
        answer:
          "Five at a time. That's enough to fill an entire round on your own, so you get your results without waiting for anyone else to show up.",
      },
      {
        question: "What does it cost?",
        answer:
          "Two things, both shown before you confirm: the spin price, and a small fee that pays for the random draw. You'll see the total too. On top of that your wallet charges its own network fee, which it works out when you sign.",
      },
    ],
  },
  {
    id: "spins-and-rewards",
    title: "Spins and Rewards",
    description: "Rarity, odds, and what actually lands in your wallet.",
    items: [
      {
        question: "Which coins can I get?",
        answer:
          "Whatever's loaded in the machine right now. The full list — every prize, its rarity, how much you could get and the exact odds — is on the Rewards page, and you can read all of it before spending anything.",
      },
      {
        question: "Can I see the odds?",
        answer:
          "Yes, always, before you pay. They're at the top of the app, on every rarity and on each prize. Those exact numbers are what the draw actually runs on — there's no second set behind them.",
      },
      {
        question: "What do the rarities mean?",
        answer:
          "How hard something is to pull. Common comes up most often, legendary least, and rarer usually means you get more. Rarity doesn't decide whether you get something — every spin gives you a prize.",
      },
      {
        question: "Can the same coin show up in more than one rarity?",
        answer:
          "Yes. A pool can stock the same coin at different amounts — a small common prize and a much bigger legendary one. Genesis Pool does exactly that with Cash Cat.",
      },
    ],
  },
  {
    id: "wallets-and-claims",
    title: "Wallets and Claims",
    description: "Connecting, claiming, and where your prizes sit.",
    items: [
      {
        question: "How do I get my reward?",
        answer:
          "A spin doesn't resolve the second you pay. It waits for its round to fill up or time out, then for the random draw to come back — usually a few minutes. After that your prize appears in My Bag, and claiming moves it into your wallet. Claim one at a time, or everything at once.",
      },
      {
        question: "Which wallets work?",
        answer:
          "Any browser wallet that can connect to Robinhood Chain.",
      },
      {
        question: "What if I disconnect before claiming?",
        answer:
          "Nothing is lost. Prizes stay tied to the wallet that won them — reconnect that wallet and they're back in My Bag.",
      },
      {
        question: "Is there a deadline to claim?",
        answer:
          "No, there's no expiry. If that ever changed we'd show it on the reward itself, well before it applied.",
      },
    ],
  },
  {
    id: "reward-pools",
    title: "The Machine",
    description: "How a pool is put together, and when it changes.",
    items: [
      {
        question: "Does the machine get restocked?",
        answer:
          "There's one pool running today — Genesis Pool. Its prizes, odds and price are frozen: once a pool starts selling spins, none of that can be edited by anyone, including us. Changing it means starting a new version of the pool, and we'd say so clearly when that happens.",
      },
      {
        question: "How do you pick the coins?",
        answer:
          "Coins that are active on Robinhood Chain, plus ones people ask for. Sponsors can pay to get a coin stocked in the machine — but they can't buy better odds. The odds are published up front and are the same for everyone.",
      },
      {
        question: "What if the machine runs out of a prize?",
        answer:
          "Every spin checks there's enough in the prize vault to pay it in full. If there isn't, that spin is refunded instead of paying you short. You can see how much is left in stock on every prize.",
      },
    ],
  },
  {
    id: "robinhood-chain",
    title: "Robinhood Chain",
    description: "The network this runs on.",
    items: [
      {
        question: "Is this built on Robinhood Chain?",
        answer:
          "Yes, all of it — the spins, the prize vault, and the coins you win.",
      },
      {
        question: "Are you connected to Robinhood?",
        answer:
          "No. ROBACHA is an independent project built for Robinhood Chain. Robinhood doesn't own it, run it or endorse it, and nothing here should be read as suggesting otherwise.",
      },
      {
        question: "Do I need to set anything up?",
        answer:
          "Just have Robinhood Chain selected in your wallet. If you're on a different network the app asks you to switch rather than letting a spin go through on the wrong one.",
      },
    ],
  },
  {
    id: "rob",
    title: "$ROB",
    description: "The official utility token, and what it does.",
    items: [
      {
        question: "What is $ROB?",
        answer:
          "$ROB is Robacha's official utility token on Robinhood Chain. The one that counts is the contract published on the $ROB page — a ticker can be copied, a contract address can't, so match the address before trusting any listing.",
      },
      {
        question: "Can I spin using $ROB?",
        answer:
          "Yes. Paying with $ROB swaps it for exactly the ETH a spin costs at that moment, so the machine always receives the same thing regardless of how you paid.",
      },
      {
        question: "Why does Robacha buy back and burn $ROB?",
        answer:
          "A share of protocol fees is used to buy $ROB back and send it to a dead address no one holds the key to. \"Burned\" just means it sits at that address forever — you can verify the address and its balance on the transparency page.",
      },
      {
        question: "Where can I verify the $ROB contract?",
        answer:
          "On the $ROB page, which links straight to the contract on the explorer. This is not financial advice, and nothing here is a claim about price.",
      },
    ],
  },
  {
    id: "more-robacha",
    title: "More Robacha",
    description: "Raffles, capsules and the machines still to come.",
    items: [
      {
        question: "What is the Raffle Launchpad?",
        answer:
          "A permissionless hub where anyone can turn an NFT they own into a trustless raffle. The NFT is held in the contract's escrow for the whole raffle: on a sellout it goes to the drawn winner; if it doesn't sell out, every ticket refunds and the NFT returns to the creator.",
      },
      {
        question: "How do I know a raffled collection is real?",
        answer:
          "Each raffle shows whether its collection is verified by contract address, and flags collections whose name copies a verified one but whose address is different. Identity is the address, never the name — check it before buying tickets.",
      },
      {
        question: "What are Robacha Capsules?",
        answer:
          "A limited mint of 500 capsules built for the machine — mint one and hold it, trade it, or spend an eligible one back into the machine. It isn't live yet; the mint console stays locked until a contract makes it real.",
      },
      {
        question: "What are NFT Spins and the Stock Machine?",
        answer:
          "Upcoming machines. NFT Spins pulls collectibles from published NFT pools; the Stock Machine is being built for tokenized-stock rewards on Robinhood Chain. Both are coming soon and say so plainly — no assets, odds or dates are published until a contract exists.",
      },
    ],
  },
  {
    id: "risk-and-transparency",
    title: "Risk and Straight Answers",
    description: "What works today, what doesn't, and what can go wrong.",
    items: [
      {
        question: "Is ROBACHA live?",
        answer:
          "The contracts are live on Robinhood Chain, and everything you see — prizes, price, odds, what's left in stock — is read straight from them. Paid spins are still switched off while we finish testing, so the spin button stays disabled rather than pretending to work.",
      },
      {
        question: "Can you pick what I get?",
        answer:
          "No, and the order things happen in is why. Your round closes first, so who is in it is fixed. Only then do we buy a random number from StonkPit, and that number is folded from the next four certified mining prints — work that hasn't been done yet at the moment your round closed. Nobody knows it then, us included, and we can't ask for a different one. Your specific prize is that number mixed with your wallet address and your place in the round, so everyone in the same round draws separately.",
      },
      {
        question: "So what CAN you do?",
        answer:
          "Less than we used to, and we'd rather say what's left than have you find it. We used to seal the number ourselves, which meant we could refuse to unseal one we didn't like and cancel the round. That's gone — we don't hold the number any more and delivery doesn't depend on us. What's left isn't ours to do: this is sealed by real mining work rather than a cryptographic proof, so whoever orders transactions on the chain could in principle pick between outcomes that real work produced. They can't invent one. It's kept small by how little rides on a single round — five spins, and every prize capped at a quarter of what's in the vault for that token.",
      },
      {
        question: "Can I check the code?",
        answer:
          "Yes. Every contract is deployed and source-verified on Robinhood Chain, so you can read exactly what runs. All the addresses are in the docs with links to the explorer.",
      },
      {
        question: "What are the risks?",
        answer:
          "Coins can fall in value, sometimes sharply, and some can be hard to sell — check any prize's live price before you spin. Smart contracts can carry bugs. Treat money spent on spins as spent, not invested. The Risk Disclosure has the full version.",
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
