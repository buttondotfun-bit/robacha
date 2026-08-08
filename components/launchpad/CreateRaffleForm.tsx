"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isAddress, parseEther, type Address } from "viem";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCcw,
  Ticket,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/shared/primitives";
import { XIcon } from "@/components/brand/XIcon";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useCreateRaffle, useHubStatus } from "@/lib/use-raffle-hub";
import { useOwnedNfts, type OwnedNft } from "@/lib/use-owned-nfts";
import { useNftMetadata } from "@/lib/use-nft-metadata";
import { useMoney } from "@/lib/use-money";
import { useWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";
import { LaunchpadUnavailable } from "./LaunchpadUnavailable";

const DURATIONS = [
  { label: "6h", seconds: 6 * 3600 },
  { label: "12h", seconds: 12 * 3600 },
  { label: "24h", seconds: 24 * 3600 },
  { label: "48h", seconds: 48 * 3600 },
  { label: "72h", seconds: 72 * 3600 },
];
const TICKET_PRESETS = [100, 200, 500, 1000];

type Step = "prize" | "configure" | "review" | "launch";

interface SelectedNft {
  contract: Address;
  tokenId: bigint;
  name: string | null;
  collectionName: string | null;
  image: string | null;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "prize", label: "Prize" },
  { key: "configure", label: "Raffle" },
  { key: "review", label: "Review" },
  { key: "launch", label: "Launch" },
];

export function CreateRaffleForm() {
  const wallet = useWallet();
  const money = useMoney();
  const { configured, listingsPaused, feeBps } = useHubStatus();
  const { create, step: txStep, error: txError, newId, reset: resetTx } = useCreateRaffle();

  const [step, setStep] = useState<Step>("prize");
  const [selected, setSelected] = useState<SelectedNft | null>(null);
  const [price, setPrice] = useState("0.01");
  const [cap, setCap] = useState("200");
  const [perWallet, setPerWallet] = useState("25");
  const [duration, setDuration] = useState(DURATIONS[2].seconds);
  const [escrowAck, setEscrowAck] = useState(false);

  const feePct = feeBps / 100;
  const creatorPct = 100 - feePct;

  const capN = Number(cap);
  const perWalletN = Number(perWallet);
  let priceWei: bigint | null = null;
  try {
    priceWei = price.trim() ? parseEther(price.trim()) : null;
  } catch {
    priceWei = null;
  }

  const configErrors = useMemo(() => {
    const e: string[] = [];
    if (price && (!priceWei || priceWei <= 0n)) e.push("Ticket price must be greater than zero.");
    if (cap && (!Number.isInteger(capN) || capN < 2 || capN > 10000)) e.push("Total tickets must be between 2 and 10,000.");
    if (perWallet && (!Number.isInteger(perWalletN) || perWalletN < 1)) e.push("Max per wallet must be at least 1.");
    if (Number.isInteger(capN) && Number.isInteger(perWalletN) && perWalletN > capN) e.push("Max per wallet can't exceed total tickets.");
    return e;
  }, [price, priceWei, cap, capN, perWallet, perWalletN]);

  const configValid =
    priceWei !== null && priceWei > 0n &&
    Number.isInteger(capN) && capN >= 2 && capN <= 10000 &&
    Number.isInteger(perWalletN) && perWalletN >= 1 && perWalletN <= capN;

  // Economics (from the contract's real fee).
  const grossWei = priceWei && Number.isInteger(capN) ? priceWei * BigInt(capN) : null;
  const creatorWei = grossWei !== null ? (grossWei * BigInt(10000 - feeBps)) / 10000n : null;
  const protocolWei = grossWei !== null && creatorWei !== null ? grossWei - creatorWei : null;

  if (!configured) return <LaunchpadUnavailable />;

  async function launch() {
    if (!selected || !priceWei) return;
    setStep("launch");
    await create({
      nft: selected.contract,
      tokenId: selected.tokenId,
      ticketPriceWei: priceWei,
      ticketCap: capN,
      maxPerWallet: perWalletN,
      duration,
    });
  }

  return (
    <div>
      {/* Header */}
      <Link href="/launchpad" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Launchpad
      </Link>
      <p className="micro mt-3 text-ink-3">Create a raffle</p>
      <h1 className="text-page-title mt-1.5">Create a raffle.</h1>
      <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-2">
        Choose an NFT you own, set the raffle economics, and launch it on Robinhood Chain.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        <Marker>NFT escrowed on-chain</Marker>
        <Marker>{creatorPct}% creator share</Marker>
        <Marker>On-chain settlement</Marker>
      </ul>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {listingsPaused ? (
        <p className="mt-4 rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.05)] p-3 text-[12.5px] text-ink-2">
          New listings are paused right now. You can build a raffle, but launching is temporarily disabled.
        </p>
      ) : null}

      <div className="mt-6">
        {step === "prize" ? (
          <PrizeStep
            wallet={wallet}
            selected={selected}
            onSelect={setSelected}
            onContinue={() => setStep("configure")}
          />
        ) : null}

        {step === "configure" && selected ? (
          <ConfigureStep
            selected={selected}
            price={price}
            setPrice={setPrice}
            cap={cap}
            setCap={setCap}
            perWallet={perWallet}
            setPerWallet={setPerWallet}
            duration={duration}
            setDuration={setDuration}
            errors={configErrors}
            valid={configValid}
            money={money}
            economics={{ grossWei, creatorWei, protocolWei, creatorPct, feePct, capN }}
            onBack={() => setStep("prize")}
            onContinue={() => setStep("review")}
          />
        ) : null}

        {step === "review" && selected ? (
          <ReviewStep
            selected={selected}
            priceWei={priceWei}
            capN={capN}
            perWalletN={perWalletN}
            duration={duration}
            money={money}
            economics={{ grossWei, creatorWei, protocolWei, creatorPct, feePct }}
            escrowAck={escrowAck}
            setEscrowAck={setEscrowAck}
            disabled={!!listingsPaused}
            onBack={() => setStep("configure")}
            onLaunch={launch}
          />
        ) : null}

        {step === "launch" && selected ? (
          <LaunchStep
            selected={selected}
            priceWei={priceWei}
            capN={capN}
            duration={duration}
            money={money}
            txStep={txStep}
            txError={txError}
            newId={newId}
            onRetry={() => {
              resetTx();
              setStep("review");
            }}
          />
        ) : null}
      </div>

      {/* Trust strip */}
      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-5 text-[11px] font-medium text-ink-3">
        <TrustItem>On-chain escrow</TrustItem>
        <TrustItem>Verifiable draw</TrustItem>
        <TrustItem>Contract settlement</TrustItem>
        <TrustItem>Refund protection</TrustItem>
      </div>
    </div>
  );
}

// ================================================================= Step 1
function PrizeStep({
  wallet,
  selected,
  onSelect,
  onContinue,
}: {
  wallet: ReturnType<typeof useWallet>;
  selected: SelectedNft | null;
  onSelect: (n: SelectedNft | null) => void;
  onContinue: () => void;
}) {
  const [manual, setManual] = useState(false);
  const { nfts, isLoading, error, refetch } = useOwnedNfts(
    wallet.isConnected && !wallet.wrongNetwork ? wallet.address : null,
  );

  if (!wallet.isConnected) {
    return (
      <Panel>
        <Empty
          icon={<Wallet className="h-6 w-6" aria-hidden="true" />}
          title="Connect wallet to start"
          body="Connect the wallet that holds the NFT you want to raffle."
        />
        <div className="mt-4 flex justify-center">
          <Button variant="primary" size="lg" onClick={() => void wallet.connect()} disabled={wallet.isConnecting}>
            {wallet.isConnecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wallet className="h-4 w-4" aria-hidden="true" />}
            Connect wallet
          </Button>
        </div>
      </Panel>
    );
  }

  if (wallet.wrongNetwork) {
    return (
      <Panel>
        <Empty title="Wrong network" body="Switch to Robinhood Chain to see the NFTs you can raffle." />
        <div className="mt-4 flex justify-center">
          <Button variant="primary" size="lg" onClick={() => void wallet.switchNetwork()}>
            Switch to Robinhood Chain
          </Button>
        </div>
      </Panel>
    );
  }

  // Selected → premium prize summary.
  if (selected) {
    return (
      <SelectedPrize selected={selected} onChange={() => onSelect(null)} onContinue={onContinue} />
    );
  }

  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.01em]">Select your prize</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8ec500]" aria-hidden="true" /> Connected · {shortAddress(wallet.address ?? "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refetch} className="glass-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] text-ink-2 hover:text-ink">
            <RefreshCcw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} aria-hidden="true" /> Refresh
          </button>
          <button type="button" onClick={() => setManual((m) => !m)} className="glass-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] text-ink-2 hover:text-ink">
            {manual ? "Pick from wallet" : "Enter manually"}
          </button>
        </div>
      </div>

      {manual ? (
        <ManualEntry address={wallet.address ?? ""} onSelect={onSelect} />
      ) : isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.05)]" />
          ))}
        </div>
      ) : nfts.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {nfts.map((n) => (
            <NftPickCard
              key={`${n.contract}-${n.tokenId}`}
              nft={n}
              onClick={() =>
                onSelect({
                  contract: n.contract,
                  tokenId: BigInt(n.tokenId),
                  name: n.name,
                  collectionName: n.collectionName,
                  image: n.image,
                })
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <Empty
            icon={<ImageIcon className="h-6 w-6" aria-hidden="true" />}
            title="No eligible NFTs found"
            body="We couldn't find an ERC-721 in this wallet on Robinhood Chain."
          />
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" size="md" onClick={refetch}>
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
            </Button>
            <Button variant="secondary" size="md" onClick={() => setManual(true)}>
              Enter manually
            </Button>
          </div>
        </div>
      )}

      {error && !manual ? <p className="mt-3 text-[12px] text-[#c0564f]">{error}</p> : null}
    </Panel>
  );
}

function NftPickCard({ nft, onClick }: { nft: OwnedNft; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card group overflow-hidden rounded-[16px] text-left transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[rgb(var(--ink-rgb)_/_0.05)]">
        <NftImg src={nft.image} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="p-2.5">
        <p className="truncate text-[12.5px] font-semibold">{nft.name || nft.collectionName || "NFT"}</p>
        <p className="num truncate text-[11px] text-ink-3">#{nft.tokenId}</p>
      </div>
    </button>
  );
}

function ManualEntry({ address, onSelect }: { address: string; onSelect: (n: SelectedNft) => void }) {
  const [contract, setContract] = useState("");
  const [tokenId, setTokenId] = useState("");
  const nftValid = isAddress(contract.trim());
  const idValid = /^\d+$/.test(tokenId.trim());
  const previewNft = nftValid ? (contract.trim() as Address) : null;
  const previewToken = idValid ? BigInt(tokenId.trim()) : null;
  const meta = useNftMetadata(previewNft, previewToken);

  return (
    <div className="mt-4 rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.08)] p-4">
      <p className="text-[12.5px] font-semibold">Enter an NFT manually</p>
      <p className="mt-0.5 text-[11.5px] text-ink-3">The ERC-721 contract and token id, on Robinhood Chain. Ownership is checked before launch.</p>
      <div className="mt-3 space-y-3">
        <Field label="NFT contract">
          <TextInput value={contract} onChange={setContract} placeholder="0x…" mono />
        </Field>
        <Field label="Token ID">
          <TextInput value={tokenId} onChange={setTokenId} placeholder="e.g. 1234" mono inputMode="numeric" />
        </Field>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
          {previewNft && previewToken !== null ? (
            <>
              <span className="relative h-8 w-8 overflow-hidden rounded-[8px] bg-[rgb(var(--ink-rgb)_/_0.05)]">
                <NftImg src={meta.image} className="h-full w-full object-cover" />
              </span>
              <span className="truncate">{meta.name || meta.collectionName || "Reading metadata…"}</span>
            </>
          ) : (
            <span>Enter a contract and token id.</span>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          disabled={!nftValid || !idValid}
          onClick={() =>
            onSelect({
              contract: previewNft!,
              tokenId: previewToken!,
              name: meta.name,
              collectionName: meta.collectionName,
              image: meta.image,
            })
          }
        >
          Use this NFT
        </Button>
      </div>
      <p className="mt-2 num text-[10.5px] text-ink-3">{shortAddress(address)}</p>
    </div>
  );
}

function SelectedPrize({ selected, onChange, onContinue }: { selected: SelectedNft; onChange: () => void; onContinue: () => void }) {
  const link = explorerUrl("token", selected.contract);
  return (
    <Panel>
      <p className="micro text-ink-3">Your prize</p>
      <div className="mt-3 grid gap-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute -inset-2 rounded-[24px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(204,255,0,0.14),rgba(255,158,196,0.08)_60%,transparent_75%)]" />
          <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-white/60">
            <NftImg src={selected.image} className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[20px] font-semibold tracking-[-0.02em]">{selected.name || selected.collectionName || "Your NFT"}</p>
          {selected.collectionName && selected.name ? <p className="text-[13px] text-ink-3">{selected.collectionName}</p> : null}
          <p className="num mt-1 text-[13px] text-ink-2">#{selected.tokenId.toString()}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-ink">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Ownership verified
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">Robinhood Chain</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="md" onClick={onChange}>Change NFT</Button>
            {link ? (
              <a href={link} target="_blank" rel="noreferrer" className="glass-chip inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-ink-2 hover:text-ink">
                View on explorer <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" size="lg" onClick={onContinue}>
          Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </Panel>
  );
}

// ================================================================= Step 2
interface Economics {
  grossWei: bigint | null;
  creatorWei: bigint | null;
  protocolWei: bigint | null;
  creatorPct: number;
  feePct: number;
  capN?: number;
}

function ConfigureStep(props: {
  selected: SelectedNft;
  price: string;
  setPrice: (v: string) => void;
  cap: string;
  setCap: (v: string) => void;
  perWallet: string;
  setPerWallet: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  errors: string[];
  valid: boolean;
  money: ReturnType<typeof useMoney>;
  economics: Economics;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { selected, price, setPrice, cap, setCap, perWallet, setPerWallet, duration, setDuration, errors, valid, money, economics, onBack, onContinue } = props;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
      {/* Config */}
      <Panel>
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Configure raffle</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Ticket price" hint={economics.grossWei !== null && money.hasPrice && props.money ? undefined : "Per entry"}>
            <div className="flex h-11 items-center rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-[rgb(var(--surface-rgb))] px-3.5 focus-within:border-[rgb(var(--line-rgb)_/_0.3)]">
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0.01" className="num w-full bg-transparent text-[14px] outline-none" aria-label="Ticket price in ETH" />
              <span className="text-[12px] text-ink-3">ETH</span>
            </div>
          </Field>

          <Field label="Duration">
            <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
              {DURATIONS.map((d) => (
                <button
                  key={d.seconds}
                  type="button"
                  onClick={() => setDuration(d.seconds)}
                  className={cn(
                    "h-11 shrink-0 rounded-[12px] px-3.5 text-[13px] font-medium transition-colors",
                    duration === d.seconds ? "bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]" : "glass-chip text-ink-2 hover:text-ink",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Total tickets" hint="2–10,000">
            <TextInput value={cap} onChange={setCap} placeholder="200" mono inputMode="numeric" tall />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TICKET_PRESETS.map((n) => (
                <button key={n} type="button" onClick={() => setCap(String(n))} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors", Number(cap) === n ? "bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]" : "glass-chip text-ink-2 hover:text-ink")}>
                  {n.toLocaleString()}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Max per wallet" hint="Entries one wallet can buy">
            <TextInput value={perWallet} onChange={setPerWallet} placeholder="25" mono inputMode="numeric" tall />
          </Field>
        </div>

        {errors.length > 0 ? (
          <ul className="mt-4 space-y-1">
            {errors.map((e) => (
              <li key={e} className="text-[12px] text-[#c0564f]">{e}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex items-center justify-between">
          <Button variant="secondary" size="lg" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</Button>
          <Button variant="primary" size="lg" disabled={!valid} onClick={onContinue}>Continue to review <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </Panel>

      {/* Economics + preview (sticky on desktop) */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <EconomicsPanel money={money} economics={economics} capN={Number(cap)} priceLabel={price} />
        <LivePreview selected={selected} price={price} cap={Number(cap)} duration={duration} money={money} />
      </div>
    </div>
  );
}

function EconomicsPanel({ money, economics, capN, priceLabel }: { money: ReturnType<typeof useMoney>; economics: Economics; capN: number; priceLabel: string }) {
  const { grossWei, creatorWei, protocolWei, creatorPct, feePct } = economics;
  return (
    <div className="glass-card rounded-[18px] p-4">
      <p className="micro text-ink-3">Raffle economics</p>
      <dl className="mt-3 space-y-2 text-[13px]">
        <Line label="Ticket price">{priceLabel && Number(priceLabel) > 0 ? `${priceLabel} ETH` : "—"}</Line>
        <Line label="Tickets">{Number.isInteger(capN) ? capN.toLocaleString() : "—"}</Line>
        <Line label="Maximum gross">{grossWei !== null ? money.native(grossWei) : "—"}</Line>
        <div className="my-1 border-t border-[rgb(var(--line-rgb)_/_0.1)]" />
        <Line label={`Creator (${creatorPct}%)`} strong accent>{creatorWei !== null ? money.native(creatorWei) : "—"}</Line>
        <Line label={`Robacha fee (${feePct}%)`}>{protocolWei !== null ? money.native(protocolWei) : "—"}</Line>
      </dl>
      <div className="mt-3">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          <div className="bg-[#a6d900] transition-[width] duration-500" style={{ width: `${creatorPct}%` }} />
          <div className="bg-[rgb(var(--ink-rgb)_/_0.16)] transition-[width] duration-500" style={{ width: `${feePct}%` }} />
        </div>
      </div>
      {creatorWei !== null ? (
        <div className="mt-3 rounded-[12px] bg-[rgba(204,255,0,0.1)] p-3">
          <p className="micro text-ink-3">Maximum creator proceeds</p>
          <p className="num mt-0.5 text-[18px] font-semibold text-ink">{money.native(creatorWei)}</p>
          {money.hasPrice ? <p className="num text-[11px] text-ink-3">≈ {money.usd(creatorWei)}</p> : null}
          <p className="mt-1 text-[10.5px] text-ink-3">If all {capN.toLocaleString()} tickets sell. Nothing is guaranteed.</p>
        </div>
      ) : null}
    </div>
  );
}

function LivePreview({ selected, price, cap, duration, money }: { selected: SelectedNft; price: string; cap: number; duration: number; money: ReturnType<typeof useMoney> }) {
  const hours = Math.round(duration / 3600);
  return (
    <div className="glass-card overflow-hidden rounded-[18px]">
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="micro text-ink-3">Preview</span>
        <span className="glass-chip rounded-full px-2 py-0.5 text-[10px] text-ink-3">Not live yet</span>
      </div>
      <div className="relative mt-2 aspect-[16/10] w-full overflow-hidden bg-[rgb(var(--ink-rgb)_/_0.05)]">
        <NftImg src={selected.image} className="h-full w-full object-cover" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(20,20,20,0.5)] px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">Live</span>
      </div>
      <div className="p-3.5">
        <p className="truncate text-[13.5px] font-semibold">{selected.name || selected.collectionName || "Your NFT"} <span className="num text-ink-3">#{selected.tokenId.toString()}</span></p>
        <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-ink-3">
          <span className="num">0 / {Number.isInteger(cap) ? cap : "—"} tickets</span>
          <span className="num">{price && Number(price) > 0 ? `${price} ETH` : "—"} · {hours}h</span>
        </div>
        <div className="mt-2 grid h-9 place-items-center rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] text-[12px] font-semibold text-ink-3">Enter raffle →</div>
      </div>
    </div>
  );
}

// ================================================================= Step 3
function ReviewStep(props: {
  selected: SelectedNft;
  priceWei: bigint | null;
  capN: number;
  perWalletN: number;
  duration: number;
  money: ReturnType<typeof useMoney>;
  economics: Economics;
  escrowAck: boolean;
  setEscrowAck: (v: boolean) => void;
  disabled: boolean;
  onBack: () => void;
  onLaunch: () => void;
}) {
  const { selected, priceWei, capN, perWalletN, duration, money, economics, escrowAck, setEscrowAck, disabled, onBack, onLaunch } = props;
  const hours = Math.round(duration / 3600);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start">
      <Panel>
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Review your raffle</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-[rgb(var(--ink-rgb)_/_0.05)]">
            <NftImg src={selected.image} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="micro text-ink-3">Prize</p>
            <p className="truncate text-[15px] font-semibold">{selected.name || selected.collectionName || "Your NFT"}</p>
            <p className="num text-[12px] text-ink-3">{shortAddress(selected.contract)} · #{selected.tokenId.toString()}</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4 text-[13px]">
          <Term label="Ticket price">{priceWei ? money.native(priceWei) : "—"}</Term>
          <Term label="Total tickets">{capN.toLocaleString()}</Term>
          <Term label="Max / wallet">{perWalletN}</Term>
          <Term label="Duration">{hours}h</Term>
          <Term label="Gross if sold out">{economics.grossWei !== null ? money.native(economics.grossWei) : "—"}</Term>
          <Term label={`You receive (${economics.creatorPct}%)`} accent>{economics.creatorWei !== null ? money.native(economics.creatorWei) : "—"}</Term>
        </dl>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel>
          <p className="text-[13px] font-semibold">Settlement</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
            <div className="rounded-[12px] bg-[rgba(204,255,0,0.1)] p-3">
              <p className="font-semibold">If it sells out</p>
              <p className="mt-1 leading-relaxed text-ink-2">Winner drawn on chain gets the NFT. You receive {economics.creatorPct}%, Robacha {economics.feePct}%.</p>
            </div>
            <div className="rounded-[12px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-3">
              <p className="font-semibold">If it doesn&rsquo;t</p>
              <p className="mt-1 leading-relaxed text-ink-2">Every ticket is refundable in full and your NFT is returned — enforced by the contract.</p>
            </div>
          </div>
        </Panel>

        <div className="rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--surface-rgb)_/_0.5)] p-4">
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            When you launch, your NFT is transferred into the raffle contract and held there until the raffle settles — a winner receives it, or it&rsquo;s returned to you if the raffle doesn&rsquo;t complete.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" checked={escrowAck} onChange={(e) => setEscrowAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#a6d900]" />
            <span className="text-[12.5px] text-ink">I understand this NFT will be escrowed by the raffle contract.</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="secondary" size="lg" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</Button>
          <Button variant="primary" size="lg" disabled={!escrowAck || disabled} onClick={onLaunch}>Approve &amp; launch <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </div>
    </div>
  );
}

// ================================================================= Step 4
function LaunchStep(props: {
  selected: SelectedNft;
  priceWei: bigint | null;
  capN: number;
  duration: number;
  money: ReturnType<typeof useMoney>;
  txStep: string;
  txError: string | null;
  newId: number | null;
  onRetry: () => void;
}) {
  const { selected, priceWei, capN, duration, money, txStep, txError, newId, onRetry } = props;
  const hours = Math.round(duration / 3600);

  if (txStep === "done" && newId) {
    const raffleUrl = typeof window !== "undefined" ? `${window.location.origin}/launchpad/${newId}` : `/launchpad/${newId}`;
    const tweet = `https://x.com/intent/tweet?text=${encodeURIComponent(
      `Just launched a raffle on @robachadotfun 🎟️\n\n${capN} entries · ${priceWei ? money.native(priceWei) : ""} each`,
    )}&url=${encodeURIComponent(raffleUrl)}`;
    return (
      <Panel>
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(204,255,0,0.2)] text-accent-ink">
            <Check className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">Your raffle is live.</h2>
          <div className="mx-auto mt-4 flex max-w-[320px] items-center gap-3 rounded-[16px] border border-[rgb(var(--line-rgb)_/_0.08)] p-3 text-left">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-[rgb(var(--ink-rgb)_/_0.05)]">
              <NftImg src={selected.image} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">{selected.name || selected.collectionName || "Your NFT"} <span className="num text-ink-3">#{selected.tokenId.toString()}</span></p>
              <p className="num text-[11.5px] text-ink-3">{capN} tickets · {priceWei ? money.native(priceWei) : ""} · {hours}h</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link href={`/launchpad/${newId}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(168deg,rgba(226,255,120,0.96),rgba(204,255,0,0.98))] px-6 text-[14px] font-semibold text-[var(--on-accent)] shadow-[var(--shadow-neon)]">
              View raffle <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href={tweet} target="_blank" rel="noreferrer" className="glass-chip inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-ink-2 hover:text-ink">
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" /> Share on X
            </a>
            <CopyLink url={raffleUrl} />
          </div>
        </div>
      </Panel>
    );
  }

  if (txStep === "error") {
    return (
      <Panel>
        <ErrorState
          title="Couldn't launch"
          description={friendly(txError)}
          action={<Button size="md" variant="secondary" onClick={onRetry}>Back to review</Button>}
        />
      </Panel>
    );
  }

  // Progress
  const approving = txStep === "approving";
  const creating = txStep === "creating";
  return (
    <Panel>
      <p className="text-[15px] font-semibold tracking-[-0.01em]">Launching your raffle</p>
      <ol className="mt-4 space-y-2.5">
        <TxLine active={approving} done={creating} label="Approve NFT" hint="Allow the contract to escrow your NFT" />
        <TxLine active={creating} done={false} label="Create raffle" hint="Transfer the NFT into escrow and open ticket sales" />
      </ol>
      <p className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-ink-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {approving ? "Confirm the approval in your wallet…" : "Creating the raffle — confirm in your wallet…"}
      </p>
    </Panel>
  );
}

function TxLine({ active, done, label, hint }: { active: boolean; done: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", done ? "bg-[#a6d900] text-[var(--on-accent)]" : active ? "bg-[rgba(204,255,0,0.2)]" : "border border-[rgb(var(--line-rgb)_/_0.16)]")}>
        {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : active ? <Loader2 className="h-3 w-3 animate-spin text-accent-ink" aria-hidden="true" /> : null}
      </span>
      <div>
        <p className={cn("text-[13px] font-semibold", active || done ? "text-ink" : "text-ink-3")}>{label}</p>
        <p className="text-[11.5px] text-ink-3">{hint}</p>
      </div>
    </li>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); })}
      className="glass-chip inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-ink-2 hover:text-ink"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

// ================================================================= shared bits
function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mt-6 flex items-center gap-2">
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "todo";
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span className={cn("num grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold", state === "done" ? "bg-[#a6d900] text-[var(--on-accent)]" : state === "active" ? "bg-[rgb(var(--ink-rgb))] text-[rgb(var(--surface-rgb))]" : "bg-[rgb(var(--ink-rgb)_/_0.06)] text-ink-3")}>
              {state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : String(i + 1).padStart(2, "0")}
            </span>
            <span className={cn("hidden text-[12px] font-medium sm:block", state === "todo" ? "text-ink-3" : "text-ink")}>{s.label}</span>
            {i < STEPS.length - 1 ? <span className={cn("h-px flex-1", state === "done" ? "bg-[#a6d900]" : "bg-[rgb(var(--line-rgb)_/_0.12)]")} aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="glass-panel rounded-[24px] p-5 sm:p-6">{children}</div>;
}

function Empty({ icon, title, body }: { icon?: React.ReactNode; title: string; body: string }) {
  return (
    <div className="py-6 text-center">
      {icon ? <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3">{icon}</span> : null}
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-[40ch] text-[13px] text-ink-2">{body}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        {hint ? <span className="text-[11px] text-ink-3">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, mono, inputMode, tall }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; inputMode?: "numeric" | "decimal" | "text"; tall?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      spellCheck={false}
      className={cn("w-full rounded-[12px] border border-[rgb(var(--edge-rgb)_/_0.9)] bg-[rgb(var(--surface-rgb))] px-3.5 text-[14px] outline-none focus:border-[rgb(var(--line-rgb)_/_0.3)]", tall ? "h-11" : "h-11 py-2.5", mono && "num")}
    />
  );
}

function Line({ label, children, strong, accent }: { label: string; children: React.ReactNode; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-3">{label}</dt>
      <dd className={cn("num", strong && "font-semibold", accent ? "text-accent-ink" : "text-ink")}>{children}</dd>
    </div>
  );
}

function Term({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <dt className="micro">{label}</dt>
      <dd className={cn("num mt-0.5 font-medium", accent ? "text-accent-ink" : "text-ink")}>{children}</dd>
    </div>
  );
}

function Marker({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> {children}
    </li>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1 w-1 rounded-full bg-[#a6d900]" aria-hidden="true" /> {children}
    </span>
  );
}

function NftImg({ src, className }: { src: string | null; className?: string }) {
  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-[rgb(var(--ink-rgb)_/_0.05)] text-ink-3", className)}>
        <ImageIcon className="h-6 w-6 opacity-40" aria-hidden="true" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className={className} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />;
}

function friendly(message: string | null): string {
  if (!message) return "The transaction didn't go through.";
  if (/rejected|denied/i.test(message)) return "You dismissed the transaction in your wallet.";
  if (/insufficient funds|exceeds balance/i.test(message)) return "Your wallet doesn't have enough ETH for gas.";
  if (/NftNotEscrowed|ownerOf|owner/i.test(message)) return "The NFT couldn't be verified — make sure the connected wallet still owns it.";
  if (/BadConfig/i.test(message)) return "One of the raffle settings is out of range. Adjust and try again.";
  return message;
}
