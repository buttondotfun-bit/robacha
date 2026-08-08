/**
 * The RobachaRaffle surface the interface reads and writes.
 *
 * Only what the page needs: the live counts and config to read, and the two
 * user actions — buy and refund. The privileged calls (claimProceeds, fundDraw,
 * withdrawDrawFloat) and the conductor callback are deliberately absent, since
 * nothing in the app is meant to invoke them.
 */
export const ROBACHA_RAFFLE_ABI = [
  // ---- reads ----
  { type: "function", name: "ticketPriceWei", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "openAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "closesAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "ticketsSold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "TICKET_CAP", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }] },
  { type: "function", name: "MAX_PER_WALLET", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }] },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [],
    // 0 Open, 1 AwaitingDraw, 2 Complete, 3 Refundable
    outputs: [{ type: "uint8" }],
  },
  { type: "function", name: "winner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "ticketsOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint16" }],
  },
  {
    type: "function",
    name: "paidWei",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "refunded",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bool" }],
  },

  // ---- user writes ----
  {
    type: "function",
    name: "buyTicket",
    stateMutability: "payable",
    inputs: [{ name: "quantity", type: "uint16" }],
    outputs: [],
  },
  { type: "function", name: "withdrawRefund", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "markRefundable", stateMutability: "nonpayable", inputs: [], outputs: [] },

  // ---- events (for the activity feed) ----
  {
    type: "event",
    name: "TicketsBought",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "quantity", type: "uint16", indexed: false },
      { name: "walletTotal", type: "uint16", indexed: false },
      { name: "ticketsSold", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WinnerDrawn",
    inputs: [
      { name: "winner", type: "address", indexed: true },
      { name: "winningTicket", type: "uint256", indexed: false },
      { name: "word", type: "uint256", indexed: false },
    ],
  },
] as const;

/** Mirrors RobachaRaffle.State. */
export const RaffleState = {
  Open: 0,
  AwaitingDraw: 1,
  Complete: 2,
  Refundable: 3,
} as const;
