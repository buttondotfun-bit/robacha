import { chainConfig } from "@/lib/config";
import type { ActivePool, PoolReadiness } from "@/lib/use-pool";
import type { MoneyState } from "@/lib/use-money-state";

/**
 * The assistant's answers.
 *
 * Deliberately not a language model. Every question here is about someone's
 * real money — where it is, when it comes back, whether it is stuck — and a
 * generated answer that is merely plausible is a wrong answer with a
 * confident voice. So each entry is written once, reviewed against the
 * contracts, and any figure inside it is resolved from live state at the
 * moment it is asked.
 *
 * The rules for editing this file:
 *   - Never state a number that is not read from `ctx`. If it cannot be read,
 *     say it cannot be read.
 *   - Never describe behaviour the contracts do not have.
 *   - When the honest answer is "you wait" or "we can't", say that plainly.
 */

export interface AssistantContext {
  pool: ActivePool | null;
  readiness: PoolReadiness | null;
  money: MoneyState;
  connected: boolean;
  spinsEnabled: boolean;
}

export type AnswerTone = "neutral" | "good" | "warn";

export interface AssistantAnswer {
  /** Paragraphs, rendered in order. */
  body: string[];
  tone?: AnswerTone;
  action?: { label: string; href: string; external?: boolean };
}

export interface AssistantEntry {
  id: string;
  /** Shown as a suggested chip. Keep it in the user's words. */
  question: string;
  /** Lowercase tokens used for matching typed questions. */
  keywords: string[];
  /** Chips are grouped so money questions surface first. */
  group: "money" | "timing" | "playing" | "trust";
  answer: (ctx: AssistantContext) => AssistantAnswer;
}

/** "2 hours", "5 minutes" — plain words, never "7200s". */
function duration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 90) return `${Math.round(seconds)} seconds`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

const sym = chainConfig.nativeSymbol;

export const ASSISTANT_ENTRIES: AssistantEntry[] = [
  // ---------------------------------------------------------------- money
  {
    id: "refund-status",
    question: "Can I get a refund?",
    keywords: ["refund", "money back", "cancel", "back out", "undo", "reverse", "withdraw"],
    group: "money",
    answer: (ctx) => {
      const timeout = duration(ctx.money.randomnessTimeoutSeconds);

      if (!ctx.connected) {
        return {
          body: [
            "Connect your wallet and I can check whether anything is owed to you right now.",
            "The short version: you can't cancel a spin once you've paid — the draw has to be locked before it happens or the odds could be gamed. But if a spin can't be completed, you get everything back automatically.",
            timeout
              ? `If the random draw never arrives, the round becomes refundable ${timeout} after it closes, and anyone can trigger that — not just us. Then you withdraw it yourself.`
              : "If the random draw never arrives, the round becomes refundable after a set delay, and anyone can trigger that — not just us.",
          ],
        };
      }

      if (ctx.money.refundableWei === null) {
        return {
          tone: "warn",
          body: [
            "I can't read your refund balance from the contract right now, so I won't guess at it.",
            "Try again in a moment. Nothing is lost while this is unreadable — the balance lives in the contract, not in this page.",
          ],
        };
      }

      if (ctx.money.hasRefund) {
        return {
          tone: "good",
          body: [
            `You have ${ctx.money.refundableDisplay} ${sym} waiting to be withdrawn.`,
            "This is money from spins that couldn't be completed. It's held for you in the contract and only your wallet can take it out — go to My Bag to withdraw.",
          ],
          action: { label: "Go to My Bag", href: "/bag" },
        };
      }

      return {
        body: [
          "Nothing is owed to you right now — you have no refund waiting.",
          "You can't cancel a spin after paying, because the entries have to be locked before the draw happens or the odds could be gamed.",
          timeout
            ? `But you're not stuck either. If the random draw never arrives, the round becomes refundable ${timeout} after it closes, anyone can trigger that, and you withdraw your full payment — the spin price and the draw fee.`
            : "But you're not stuck either. If the random draw never arrives, the round becomes refundable after a set delay and you withdraw your full payment.",
        ],
      };
    },
  },
  {
    id: "where-is-my-money",
    question: "Where does my money go when I spin?",
    keywords: ["where", "money go", "held", "escrow", "custody", "who holds", "my funds"],
    group: "money",
    answer: (ctx) => {
      const body = [
        "It goes into the gacha contract and sits there until your round finishes. It isn't sent to us, and we can't move it while it's there.",
      ];
      if (ctx.pool) {
        body.push(
          `Once your round settles, the spin price splits: ${(ctx.pool.rewardReserveBps / 100).toFixed(0)}% goes to buying prizes, ${(ctx.pool.protocolFeeBps / 100).toFixed(0)}% to ROBACHA, ${(ctx.pool.operationsFeeBps / 100).toFixed(0)}% to running costs. Those percentages were fixed when the pool was created and can't be changed on it.`,
        );
      }
      body.push(
        "The draw fee is separate. It only covers the gas of running the draw and paying everyone out — we never keep any of it as profit.",
      );
      return { body };
    },
  },
  {
    id: "cost",
    question: "What will this cost me?",
    keywords: ["cost", "price", "how much", "fee", "expensive", "pay", "total"],
    group: "money",
    answer: (ctx) => {
      if (!ctx.pool) {
        return {
          body: [
            "There's no pool open right now, so there's no price to quote. I won't make one up.",
          ],
        };
      }
      return {
        body: [
          `One spin is ${ctx.pool.spinPriceDisplay} ${sym}, plus a small draw fee that covers running the draw. The panel shows both and the total before you confirm anything.`,
          "Your wallet adds its own network fee on top, which it calculates when you sign — that one goes to the network, not to us.",
          `You can buy up to ${ctx.pool.maxQuantityPerTx} at a time.`,
        ],
      };
    },
  },
  {
    id: "safe",
    question: "Can you take my money?",
    keywords: ["safe", "steal", "rug", "trust", "take my", "scam", "secure", "risk"],
    group: "trust",
    answer: () => ({
      body: [
        "Not from a round in progress. Your payment sits in the contract and the only ways out are: the round settles and you get a prize, or the round fails and you withdraw a refund. There's no function that lets us take it.",
        "What we can do is pause new spins. That stops people paying in — it doesn't touch money already in a round, and it doesn't block refunds or claims.",
        "The honest risks are different ones: the coins you win can fall in value, and smart contracts can have bugs. The code is verified on-chain if you want to read it.",
      ],
      action: { label: "Read the docs", href: "/docs" },
    }),
  },

  // --------------------------------------------------------------- timing
  {
    id: "how-long",
    question: "How long until I get my reward?",
    keywords: ["how long", "wait", "when", "time", "slow", "still waiting", "pending", "delay"],
    group: "timing",
    answer: (ctx) => {
      const round = duration(ctx.pool?.roundDurationSeconds ?? null);
      const timeout = duration(ctx.money.randomnessTimeoutSeconds);
      const body: string[] = [
        "Not instantly — and that's by design, not a fault.",
        "Spins are grouped into rounds. Yours waits for its round to fill up or run out of time, then the sealed number for that round is unsealed, then everything in the round is settled together. Sharing one draw across a round is what keeps the fee small.",
      ];
      if (round) {
        body.push(
          `A round closes when it's full, or after ${round} if it isn't. If you fill it yourself it closes immediately. After that the draw usually comes back within a few minutes.`,
        );
      }
      if (timeout) {
        body.push(
          `Worst case: if the draw never comes back, the round becomes refundable ${timeout} after it closes and you take your money back in full. You're never waiting indefinitely.`,
        );
      }
      return { body };
    },
  },
  {
    id: "stuck",
    question: "My spin seems stuck. What now?",
    keywords: ["stuck", "nothing happened", "not working", "frozen", "hung", "no reward", "failed", "missing"],
    group: "timing",
    answer: (ctx) => {
      const timeout = duration(ctx.money.randomnessTimeoutSeconds);
      const body: string[] = [];

      if (ctx.connected && ctx.money.hasRefund) {
        body.push(
          `You have ${ctx.money.refundableDisplay} ${sym} refundable right now — that's a spin that couldn't complete. Withdraw it from My Bag.`,
        );
      }

      body.push(
        "If your transaction confirmed, your entry is in the contract and it can't be lost. It's waiting on its round.",
        "Two things have to happen: the round closes, then the random number arrives. Both can be triggered by anyone — they don't wait on us.",
        timeout
          ? `If the number never arrives, the round can be marked refundable ${timeout} after it closed, and then you withdraw your full payment.`
          : "If the number never arrives, the round can be marked refundable after a set delay, and then you withdraw your full payment.",
        "Check the transaction on the explorer to confirm it actually went through.",
      );

      return {
        tone: ctx.connected && ctx.money.hasRefund ? "good" : "neutral",
        body,
        action: ctx.connected && ctx.money.hasRefund
          ? { label: "Go to My Bag", href: "/bag" }
          : { label: "See recent activity", href: "/activity" },
      };
    },
  },
  {
    id: "claim",
    question: "How do I claim what I won?",
    keywords: ["claim", "collect", "my bag", "withdraw reward", "get my token", "receive"],
    group: "timing",
    answer: () => ({
      body: [
        "Once your round settles, your prize shows up in My Bag. Claiming moves it into your wallet — one at a time, or everything at once.",
        "There's no deadline. Unclaimed prizes stay tied to the wallet that won them, so disconnecting doesn't lose anything — reconnect and they're still there.",
      ],
      action: { label: "Go to My Bag", href: "/bag" },
    }),
  },

  // -------------------------------------------------------------- playing
  {
    id: "odds",
    question: "What are my chances?",
    keywords: ["odds", "chance", "probability", "rare", "likely", "percent", "rigged odds"],
    group: "playing",
    answer: (ctx) => {
      if (!ctx.pool || ctx.pool.tiers.length === 0) {
        return { body: ["No pool is open, so there are no odds to show yet."] };
      }
      const list = ctx.pool.tiers
        .map((t) => `${t.rarity} ${t.probabilityPercent}%`)
        .join(", ");
      return {
        body: [
          `Right now: ${list}.`,
          "Those are the exact numbers the draw runs on — there isn't a second set behind them. Every spin is independent, so a losing streak doesn't improve your next one, and a win doesn't hurt it.",
          "Every spin returns a prize. Rarity affects how big it is, not whether you get one.",
        ],
        action: { label: "See every prize", href: "/app" },
      };
    },
  },
  {
    id: "why-disabled",
    question: "Why can't I spin?",
    keywords: ["disabled", "can't spin", "button", "greyed", "not open", "blocked", "why not"],
    group: "playing",
    answer: (ctx) => {
      if (!ctx.spinsEnabled) {
        return {
          tone: "warn",
          body: [
            "Paid spins aren't switched on yet. We're still testing, so the button stays disabled rather than pretending to work.",
            "Everything else on this page is real and live — the pool, the prizes, the odds, the stock levels are all read from the contract.",
          ],
        };
      }
      if (!ctx.connected) {
        return { body: ["Connect a wallet set to " + chainConfig.name + " and the button becomes active."] };
      }
      if (ctx.readiness && !ctx.readiness.poolOpen) {
        return { body: ["There's no pool running at the moment. Spins open as soon as one starts."] };
      }
      if (ctx.readiness && !ctx.readiness.notPaused) {
        return {
          tone: "warn",
          body: [
            "Spins are paused right now. Anything you've already won is still claimable and any refund is still withdrawable — pausing only stops new spins.",
          ],
        };
      }
      if (ctx.readiness && !ctx.readiness.randomnessAvailable) {
        return {
          tone: "warn",
          body: [
            "The random draw isn't available, so a reward can't be picked fairly. Rather than run a spin we can't settle, spins stay closed until it's back.",
            ctx.readiness.randomnessReason || "",
          ].filter(Boolean),
        };
      }
      return { body: ["Everything looks ready. If the button is still disabled, reload the page and reconnect your wallet."] };
    },
  },
  {
    id: "out-of-stock",
    question: "What if the prize runs out?",
    keywords: ["out of stock", "runs out", "empty", "inventory", "sold out", "no prizes left"],
    group: "playing",
    answer: () => ({
      body: [
        "Every spin checks there's enough in the prize vault to pay it in full before it pays out.",
        "If there isn't, that spin is refunded instead of paying you short. You never get a partial prize, and you never lose the money.",
      ],
    }),
  },

  // ---------------------------------------------------------------- trust
  {
    id: "rigged",
    question: "Can you pick what I get?",
    keywords: ["rigged", "fair", "random", "cheat", "manipulate", "fixed", "choose", "pick"],
    group: "trust",
    answer: () => ({
      body: [
        "No. Before a round opens we seal a random number and publish its fingerprint on chain. The contract refuses any number sealed after the round started, so it was fixed before your entry existed.",
        "When the round ends we unseal it and the contract checks it against that fingerprint. Swapping it for a nicer one is impossible — the check fails. The result also mixes in the addresses of everyone who entered, which we couldn't have known when we sealed it.",
        "What we could do is refuse to unseal. That doesn't change your prize — it cancels the round and refunds everyone in full. It costs us a slashed deposit and it's counted on chain permanently, so you can check how often it happens.",
      ],
      action: { label: "Read the docs", href: "/docs" },
    }),
  },
];

/**
 * Match typed text to an entry.
 *
 * Scores on keyword hits, so a partial or misspelled question still lands
 * somewhere sensible. Returns null below a confidence floor — an assistant
 * that answers the wrong money question is worse than one that admits it
 * didn't understand.
 */
export function matchEntry(input: string): AssistantEntry | null {
  const text = input.toLowerCase().trim();
  if (text.length < 2) return null;

  let best: { entry: AssistantEntry; score: number } | null = null;

  for (const entry of ASSISTANT_ENTRIES) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) score += keyword.split(" ").length * 2;
    }
    // A near-verbatim question should always win over scattered keywords.
    if (text.includes(entry.question.toLowerCase().replace(/[?]/g, ""))) score += 10;
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }

  return best && best.score >= 2 ? best.entry : null;
}
