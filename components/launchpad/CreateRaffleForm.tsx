"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress, parseEther, type Address } from "viem";
import { ArrowRight, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/primitives";
import { useCreateRaffle } from "@/lib/use-raffle-hub";
import { useHubStatus } from "@/lib/use-raffle-hub";
import { useNftMetadata } from "@/lib/use-nft-metadata";
import { useMoney } from "@/lib/use-money";
import { useWallet } from "@/lib/use-wallet";
import { NftThumb } from "./NftThumb";
import { LaunchpadUnavailable } from "./LaunchpadUnavailable";

const DURATIONS = [
  { label: "6 hours", seconds: 6 * 3600 },
  { label: "12 hours", seconds: 12 * 3600 },
  { label: "24 hours", seconds: 24 * 3600 },
  { label: "3 days", seconds: 3 * 86400 },
  { label: "7 days", seconds: 7 * 86400 },
];

/**
 * The listing flow. Fields map one-to-one to the contract's bounds, so the
 * client rejects nonsense before a wallet ever opens and the terms shown are
 * exactly the terms the raffle will run on. Approve, then create — the second
 * transaction pulls the NFT into escrow.
 */
export function CreateRaffleForm() {
  const router = useRouter();
  const wallet = useWallet();
  const money = useMoney();
  const { configured, listingsPaused } = useHubStatus();
  const { create, step, error, reset } = useCreateRaffle();

  const [nft, setNft] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [cap, setCap] = useState("100");
  const [perWallet, setPerWallet] = useState("10");
  const [duration, setDuration] = useState(DURATIONS[2].seconds);

  const nftValid = isAddress(nft.trim());
  const tokenIdValid = /^\d+$/.test(tokenId.trim());
  const previewNft = (nftValid ? (nft.trim() as Address) : null);
  const previewToken = tokenIdValid ? BigInt(tokenId.trim()) : null;
  const meta = useNftMetadata(previewNft, previewToken);

  const capN = Number(cap);
  const perWalletN = Number(perWallet);
  let priceWei: bigint | null = null;
  try { priceWei = price.trim() ? parseEther(price.trim()) : null; } catch { priceWei = null; }

  const errors = useMemo(() => {
    const e: string[] = [];
    if (nft && !nftValid) e.push("The collection address isn't a valid address.");
    if (tokenId && !tokenIdValid) e.push("Token id must be a whole number.");
    if (price && (!priceWei || priceWei <= 0n)) e.push("Ticket price must be greater than zero.");
    if (cap && (!Number.isInteger(capN) || capN < 2 || capN > 10000)) e.push("Total tickets must be between 2 and 10,000.");
    if (perWallet && (!Number.isInteger(perWalletN) || perWalletN < 1)) e.push("Max per wallet must be at least 1.");
    if (Number.isInteger(capN) && Number.isInteger(perWalletN) && perWalletN > capN) e.push("Max per wallet can't exceed total tickets.");
    return e;
  }, [nft, nftValid, tokenId, tokenIdValid, price, priceWei, cap, capN, perWallet, perWalletN]);

  const ready =
    nftValid && tokenIdValid && priceWei !== null && priceWei > 0n &&
    Number.isInteger(capN) && capN >= 2 && capN <= 10000 &&
    Number.isInteger(perWalletN) && perWalletN >= 1 && perWalletN <= capN &&
    errors.length === 0;

  const busy = step === "approving" || step === "creating";

  if (!configured) return <LaunchpadUnavailable />;

  async function onSubmit() {
    if (!wallet.isConnected) return void wallet.connect();
    if (wallet.wrongNetwork) return void wallet.switchNetwork();
    if (!ready || !priceWei || !previewNft || previewToken === null) return;
    const id = await create({
      nft: previewNft,
      tokenId: previewToken,
      ticketPriceWei: priceWei,
      ticketCap: capN,
      maxPerWallet: perWalletN,
      duration,
    });
    if (id) router.push(`/launchpad/${id}`);
  }

  const potential = priceWei && Number.isInteger(capN) ? priceWei * BigInt(capN) : null;
  const creatorTake = potential ? (potential * 9n) / 10n : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      {/* Form */}
      <div className="glass-panel rounded-[24px] p-5 sm:p-6">
        {listingsPaused ? (
          <p className="mb-4 rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.05)] p-3 text-[12.5px] text-ink-2">
            New listings are paused right now — you can fill this in, but launching is disabled.
          </p>
        ) : null}

        <Field label="NFT collection" hint="The ERC-721 contract on Robinhood Chain.">
          <input
            value={nft}
            onChange={(e) => setNft(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            className="num w-full rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[rgb(var(--surface-rgb))] px-3.5 py-2.5 text-[13px] outline-none focus:border-[rgb(var(--line-rgb)_/_0.3)]"
          />
        </Field>

        <Field label="Token ID">
          <input
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="e.g. 1234"
            inputMode="numeric"
            className="num w-full rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[rgb(var(--surface-rgb))] px-3.5 py-2.5 text-[13px] outline-none focus:border-[rgb(var(--line-rgb)_/_0.3)]"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ticket price" hint={money.hasPrice && priceWei ? money.usd(priceWei) ?? "" : "In ETH."}>
            <div className="flex items-center rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[rgb(var(--surface-rgb))] px-3.5 py-2.5">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.01"
                inputMode="decimal"
                className="num w-full bg-transparent text-[13px] outline-none"
              />
              <span className="text-[12px] text-ink-3">ETH</span>
            </div>
          </Field>

          <Field label="Sale length">
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[rgb(var(--surface-rgb))] px-3.5 py-2.5 text-[13px] outline-none"
            >
              {DURATIONS.map((d) => (
                <option key={d.seconds} value={d.seconds}>{d.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Total tickets" hint="2–10,000.">
            <input
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              inputMode="numeric"
              className="num w-full rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[rgb(var(--surface-rgb))] px-3.5 py-2.5 text-[13px] outline-none focus:border-[rgb(var(--line-rgb)_/_0.3)]"
            />
          </Field>

          <Field label="Max per wallet">
            <input
              value={perWallet}
              onChange={(e) => setPerWallet(e.target.value)}
              inputMode="numeric"
              className="num w-full rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.8)] bg-[rgb(var(--surface-rgb))] px-3.5 py-2.5 text-[13px] outline-none focus:border-[rgb(var(--line-rgb)_/_0.3)]"
            />
          </Field>
        </div>

        {errors.length > 0 ? (
          <ul className="mt-4 space-y-1">
            {errors.map((e) => (
              <li key={e} className="text-[12px] text-[#c0564f]">{e}</li>
            ))}
          </ul>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          className="mt-5"
          disabled={busy || (wallet.isConnected && !wallet.wrongNetwork && (!ready || listingsPaused))}
          onClick={() => void onSubmit()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : !wallet.isConnected ? (
            <Wallet className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
          {!wallet.isConnected
            ? "Connect wallet"
            : wallet.wrongNetwork
              ? "Switch network"
              : step === "approving"
                ? "Approve the NFT in your wallet…"
                : step === "creating"
                  ? "Launching…"
                  : "Approve & launch raffle"}
        </Button>

        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-3">
          Two steps: approve the hub for your token, then launch. The NFT is held
          in escrow until the raffle settles.
        </p>

        {step === "error" && error ? (
          <ErrorState className="mt-3" title="Couldn't list" description={error} action={<Button size="sm" variant="secondary" onClick={reset}>Dismiss</Button>} />
        ) : null}
      </div>

      {/* Preview */}
      <div className="glass-card rounded-[20px] p-4">
        <p className="micro mb-2.5">Preview</p>
        {previewNft && previewToken !== null ? (
          <NftThumb nft={previewNft} tokenId={previewToken} className="aspect-square w-full" />
        ) : (
          <div className="grid aspect-square w-full place-items-center rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.05)] text-[12px] text-ink-3">
            Enter a collection &amp; token id
          </div>
        )}
        {meta.name || meta.collectionName ? (
          <p className="mt-3 truncate text-[14px] font-semibold">{meta.name || meta.collectionName}</p>
        ) : null}

        <dl className="mt-3 space-y-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-3 text-[12.5px]">
          <Row label="Ticket price">{priceWei ? money.native(priceWei) : "—"}</Row>
          <Row label="Total tickets">{Number.isInteger(capN) ? capN : "—"}</Row>
          <Row label="If it sells out">{potential ? money.native(potential) : "—"}</Row>
          <Row label="You keep (90%)">
            <span className="font-semibold text-accent-ink">{creatorTake ? money.native(creatorTake) : "—"}</span>
          </Row>
        </dl>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-ink-3">
          <CheckCircle2 className="h-3.5 w-3.5 text-ink-2" aria-hidden="true" />
          Platform fee 10% — charged only on a sellout.
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        {hint ? <span className="text-[11px] text-ink-3">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-3">{label}</dt>
      <dd className="num text-ink">{children}</dd>
    </div>
  );
}
