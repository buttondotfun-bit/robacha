"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/shared/primitives";
import { Reveal } from "@/components/shared/Reveal";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { useNftMetadata } from "@/lib/use-nft-metadata";
import { useHubRaffle } from "@/lib/use-raffle-hub";
import { useCollectionStats } from "@/lib/use-collection-stats";
import { verifiedCollection } from "@/data/collections";
import { formatCompact } from "@/lib/formatters";
import { CollectionBadge } from "./CollectionBadge";
import { NftThumb } from "./NftThumb";
import { HubTicketPanel } from "./HubTicketPanel";
import { HubManagePanel } from "./HubManagePanel";
import { LaunchpadUnavailable } from "./LaunchpadUnavailable";

/**
 * One raffle's page. The prize NFT, its terms, the live ticket surface and —
 * for the creator — their controls. All of it read from the hub; if the id
 * doesn't exist (or no hub is deployed) it says so rather than inventing one.
 */
export function HubRaffleDetail({ id }: { id: number }) {
  const r = useHubRaffle(id);
  const meta = useNftMetadata(r.raffle?.nft ?? null, r.raffle?.tokenId ?? null);

  if (!r.configured) {
    return (
      <PageContainer width="wide" className="py-10">
        <LaunchpadUnavailable />
      </PageContainer>
    );
  }

  if (!r.isLoading && !r.raffle?.creator) {
    return (
      <PageContainer width="narrow" className="py-16 text-center">
        <p className="text-[15px] font-semibold">Raffle not found</p>
        <p className="mt-1.5 text-[13px] text-ink-3">Raffle #{id} doesn&rsquo;t exist on the hub.</p>
        <Link href="/launchpad" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the launchpad
        </Link>
      </PageContainer>
    );
  }

  const raffle = r.raffle;
  const nftLink = raffle ? explorerUrl("token", raffle.nft) : null;
  const creatorLink = raffle ? explorerUrl("address", raffle.creator) : null;

  return (
    <PageContainer width="wide" className="pb-16 pt-6">
      <Link href="/launchpad" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Launchpad
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
        {/* Prize + terms */}
        <Reveal className="glass-panel glass-reflection relative overflow-hidden rounded-[28px] p-5 sm:p-6">
          <span className="noise-overlay" aria-hidden="true" />
          <div className="relative grid gap-5 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start">
            {raffle ? (
              <NftThumb nft={raffle.nft} tokenId={raffle.tokenId} className="aspect-square w-full" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-[16px] bg-[rgb(var(--ink-rgb)_/_0.06)]" />
            )}

            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
                {meta.name || (raffle ? `${meta.collectionName ?? "NFT"} #${raffle.tokenId.toString()}` : "Raffle")}
              </h1>
              {raffle ? (
                <p className="mt-1 text-[12.5px] text-ink-3">
                  {(verifiedCollection(raffle.nft)?.name ?? meta.collectionName)
                    ? `${verifiedCollection(raffle.nft)?.name ?? meta.collectionName} · `
                    : ""}
                  Token #{raffle.tokenId.toString()}
                </p>
              ) : null}

              {raffle ? (
                <CollectionBadge nft={raffle.nft} onchainName={meta.collectionName} className="mt-3" />
              ) : null}

              {raffle ? (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[rgb(var(--line-rgb)_/_0.08)] pt-4 text-[13px]">
                  <Term label="Collection">
                    {nftLink ? (
                      <a href={nftLink} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:text-ink">
                        {shortAddress(raffle.nft)} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="num">{shortAddress(raffle.nft)}</span>
                    )}
                  </Term>
                  <Term label="Listed by">
                    {creatorLink ? (
                      <a href={creatorLink} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:text-ink">
                        {shortAddress(raffle.creator)} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="num">{shortAddress(raffle.creator)}</span>
                    )}
                  </Term>
                  <Term label="Total tickets">{raffle.ticketCap}</Term>
                  <Term label="Max per wallet">{raffle.maxPerWallet}</Term>
                </dl>
              ) : null}

              {raffle ? <CollectionProvenance nft={raffle.nft} /> : null}

              <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-[rgb(var(--ink-rgb)_/_0.04)] p-3 text-[11.5px] leading-relaxed text-ink-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                The NFT is held in the hub&rsquo;s escrow for the whole raffle. On a
                sellout it&rsquo;s released to the drawn winner and the creator gets
                90% of the take; if it doesn&rsquo;t sell out, every ticket refunds
                and the NFT returns to the creator. All enforced by the contract.
              </div>

              {raffle ? (
                <p className="mt-3 text-[11px] text-ink-3">
                  Something wrong with this raffle?{" "}
                  <Link href="/support" className="font-medium text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink">
                    Report it
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </Reveal>

        {/* Ticket + manage rail */}
        <div className="flex flex-col gap-4">
          <HubTicketPanel id={id} />
          <HubManagePanel id={id} />
        </div>
      </div>
    </PageContainer>
  );
}

/**
 * On-chain provenance for the prize's collection — holders, supply and the
 * explorer's own contract-verified / scam flags. Real numbers a counterfeit
 * can't fake, so an unverified collection with 900 holders reads very
 * differently from a one-holder fresh fake. Renders nothing until it has real
 * data; a scam flag turns the whole strip into a warning.
 */
function CollectionProvenance({ nft }: { nft: string }) {
  const { stats, isLoading, isError } = useCollectionStats(nft);
  if (isLoading || isError || !stats) return null;

  const flagged = stats.isScam === true;
  const hasNumbers = stats.holders != null || stats.totalSupply != null;
  if (!flagged && !hasNumbers && stats.contractVerified == null) return null;

  return (
    <div
      className={`mt-4 rounded-[14px] border p-3 ${
        flagged ? "border-[rgba(192,68,122,0.4)] bg-[rgba(192,68,122,0.1)]" : "border-[rgb(var(--line-rgb)_/_0.1)] bg-[rgb(var(--ink-rgb)_/_0.02)]"
      }`}
    >
      <p className="micro text-ink-3">Collection provenance · from the explorer</p>
      {flagged ? (
        <p className="mt-1.5 text-[12px] font-medium text-[#c0447a]">The explorer flags this contract as a scam.</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
        {stats.holders != null ? (
          <span><span className="num font-semibold text-ink">{formatCompact(stats.holders)}</span> <span className="text-ink-3">holders</span></span>
        ) : null}
        {stats.totalSupply != null ? (
          <span><span className="num font-semibold text-ink">{formatCompact(stats.totalSupply)}</span> <span className="text-ink-3">supply</span></span>
        ) : null}
        {stats.contractVerified != null ? (
          <span className="text-ink-2">{stats.contractVerified ? "Contract verified" : "Contract unverified"}</span>
        ) : null}
      </div>
    </div>
  );
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="micro">{label}</dt>
      <dd className="num mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}
