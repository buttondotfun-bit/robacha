/**
 * Artwork for tokens the DEX index has none for, keyed by contract address.
 *
 * The index resolves most logos on its own, and where it does, that wins — it
 * tracks the token rather than going stale in a file. This map is only for the
 * gaps, and a gap is common for a bridged token: the index knows the pair but
 * carries no image, so the interface falls back to the generated placeholder,
 * which reads as missing artwork rather than as a token nobody has drawn.
 *
 * Two rules, the same ones the lineup file follows:
 *
 *   1. Keyed by address, never by ticker. A ticker is not ownable and several
 *      on this chain are shared by multiple contracts, so matching on one is
 *      how the wrong project's mark ends up on a prize.
 *   2. Official artwork only, taken from a source the project itself controls,
 *      and stored here rather than hotlinked so the image cannot change under
 *      us and no third party learns who is looking at what.
 *
 * Addresses are lowercased because every lookup lowercases before comparing.
 */
export const LOCAL_TOKEN_LOGOS: Record<string, string> = {
  // SUSHI. Taken from sushiswap/list, Sushi's own token list repository, and
  // cross-checked against their CDN which serves the same mark keyed by
  // 0x6b3595068778dd592e39a122f4f5a5cf09c90fe2 — the canonical SUSHI contract
  // on Ethereum. The contract here is the bridged representation, so the index
  // has a pair for it but no image.
  "0x0bb40d7fbae7f0c69bc5910c601987dce697d85f": "/tokens/sushi.jpg",
  // MANCER. Their site renders client-side and exposes no <img>, so this came
  // from the icon.svg their own page links as its favicon — an asset they
  // control, not a screenshot or a reconstruction. The index knows all
  // seventeen of its pairs and carries no image for any of them.
  "0xc72f232a6869e6cf34dc06129affd07f8a2a246a": "/tokens/mancer.svg",
  // APE. The ape mark from apecoin.com's own favicon, downscaled to 256px.
  //
  // Worth being explicit about, because it is the one entry here that breaks
  // rule 2 above. This contract is not ApeCoin DAO's token: it carries 578,793
  // supply and an `owner()`, where the DAO's is fixed at one billion and
  // ownerless. It is a Robinhood Chain token using the name, and the artwork
  // belongs to a project that did not issue it.
  //
  // Recorded as a deliberate operator decision rather than an oversight, so
  // nobody later reads this as the ticker-matching mistake the rules exist to
  // prevent — and so it is easy to reverse if the DAO ever objects or the
  // deployer publishes a mark of their own, which would be the better answer.
  "0x8f86a15ec17cb3369d8b3e666dadbc11daa82b79": "/tokens/ape.png",
};

/** The stored logo for a contract, or null if there is none. */
export function localTokenLogo(address: string | null | undefined): string | null {
  if (!address) return null;
  return LOCAL_TOKEN_LOGOS[address.toLowerCase()] ?? null;
}
