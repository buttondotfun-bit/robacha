export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string[] }[];
}

/**
 * Placeholder legal copy. These are drafting outlines, not reviewed legal
 * documents — every page says so at the top. Replace each section body with
 * counsel-approved text before launch.
 */
export const LEGAL_DOCS: Record<string, LegalDoc> = {
  terms: {
    slug: "terms",
    title: "Terms of Service",
    summary:
      "The terms that will govern access to ROBACHA once the product is live.",
    sections: [
      {
        heading: "Acceptance",
        body: [
          "Using ROBACHA will require agreeing to these terms in full. This outline describes the areas the final agreement is expected to cover.",
        ],
      },
      {
        heading: "Eligibility",
        body: [
          "Access is intended for users who are of legal age in their jurisdiction and permitted to interact with digital assets there.",
          "A minimum age requirement will be stated explicitly in the final terms.",
        ],
      },
      {
        heading: "Restricted jurisdictions",
        body: [
          "Availability may be restricted in jurisdictions where products of this type are prohibited or require licensing. A definitive list will be published before launch.",
        ],
      },
      {
        heading: "Spins and rewards",
        body: [
          "A spin is a purchase of a randomised token reward at published odds. It is not an investment, a security, or a promise of return.",
          "Reward odds and pool composition are disclosed in the product and may change between rotations.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Automated abuse, attempts to manipulate reward distribution, and use of the product to launder or conceal funds will be prohibited.",
        ],
      },
      {
        heading: "No warranty",
        body: [
          "The product will be provided on an as-is basis to the extent permitted by law, without warranty of uninterrupted availability.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What ROBACHA collects, and what it deliberately does not.",
    sections: [
      {
        heading: "What this build stores",
        body: [
          "ROBACHA stores only local interface preferences in your browser. Balances, rewards and activity are read from Robinhood Chain, not held by us.",
          "Clearing site data removes anything stored locally.",
        ],
      },
      {
        heading: "Wallet addresses",
        body: [
          "Once live, wallet addresses that interact with the contracts will be public onchain data by nature. ROBACHA does not treat an address as private information.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "No analytics or tracking scripts run in this build. Any future analytics will be disclosed here before being enabled.",
        ],
      },
      {
        heading: "Third parties",
        body: [
          "Wallet providers and RPC endpoints you connect through operate under their own privacy policies.",
        ],
      },
    ],
  },
  risk: {
    slug: "risk",
    title: "Risk Disclosure",
    summary: "The risks of spinning for memecoin rewards, stated plainly.",
    sections: [
      {
        heading: "Token volatility",
        body: [
          "Memecoins are highly volatile. A reward's value can fall substantially, quickly, and without warning after it is received.",
          "Reward quantities are fixed at the moment of the pull. Their value is not.",
        ],
      },
      {
        heading: "Liquidity",
        body: [
          "Some tokens in a pool may be thinly traded. There is no assurance a reward can be sold at, or near, any displayed indicative value.",
        ],
      },
      {
        heading: "Reward odds",
        body: [
          "Spins are randomised at published probabilities. Each spin is independent — past results do not make any outcome more or less likely on the next one.",
          "Spending on spins should be treated as spending, not investing. Only spend what you are prepared to lose entirely.",
        ],
      },
      {
        heading: "Smart-contract risk",
        body: [
          "Once contracts are deployed, interacting with them carries the risk of bugs, exploits or unexpected behaviour, including loss of funds.",
          "Contract addresses and any audit references will be published in the pool transparency panel.",
        ],
      },
      {
        heading: "Launch status",
        body: [
          "The reward pool, token contracts, prices and odds are read live from Robinhood Chain. Spins and claims require the gacha contract, which is not yet deployed — until it is, no spin can be submitted and no reward can be drawn.",
        ],
      },
      {
        heading: "Not financial advice",
        body: [
          "Nothing in ROBACHA is financial, investment, tax or legal advice, and no outcome is guaranteed.",
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS);
