import { ExternalLink } from "lucide-react";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import { publicClient } from "@/lib/server/chain";
import {
  activeRandomnessAdapter,
  activeRandomnessReceiver,
} from "@/lib/server/randomness-adapter";

/**
 * The deployed contracts, read from configuration rather than written down.
 *
 * If an address is not configured for this deployment the row says so instead
 * of showing a stale one — the docs can never claim a contract exists that the
 * running app is not actually pointed at.
 *
 * The two randomness rows are a further step: they come from the gacha itself,
 * not from configuration. This table is the page that tells a player which
 * contract to go and check, so an address here that has fallen behind is not a
 * cosmetic staleness — it points them at the wrong contract to audit and would
 * survive as documentation of a swap that already happened. The env var is the
 * one part of an adapter migration that lives outside the transaction, and it
 * has been left behind before; the gacha's own pointer cannot be.
 */

const ROWS: { key: keyof typeof contracts; name: string; role: string }[] = [
  { key: "gacha", name: "RobachaGacha", role: "Sells entries, settles rounds, holds escrow, pays claims" },
  { key: "poolRegistry", name: "RobachaPoolRegistry", role: "Pool versions, probabilities, reward slots, immutability" },
  { key: "rewardVault", name: "RobachaRewardVault", role: "Custodies reward inventory and tracks liabilities" },
  { key: "feeRouter", name: "RobachaFeeRouter", role: "Splits base payments, enforces caps and the fee timelock" },
  // Both keys point at the same contract today: the adapter buys the word and
  // hands it back itself, so it is both the sender and the receiver. They stay
  // separate rows because the gacha stores them separately and they can be
  // pointed at different contracts — which is exactly how the source was
  // changed without redeploying anything else.
  { key: "randomnessSender", name: "RobachaStonkPitEntropy", role: "Buys the round's word from StonkPit's conductor" },
  { key: "randomnessReceiver", name: "RobachaStonkPitEntropy", role: "Receives the delivered word and hands it to the gacha" },
];

export async function ContractDirectory() {
  // Resolved on the server at render time. A failure falls back to whatever is
  // configured rather than blanking the table — a possibly-stale address with
  // a working explorer link beats an empty security section.
  const client = publicClient();
  const [liveSender, liveReceiver] = await Promise.all([
    activeRandomnessAdapter(client).catch(() => contracts.randomnessSender ?? null),
    activeRandomnessReceiver(client).catch(() => contracts.randomnessReceiver ?? null),
  ]);

  const resolved = {
    ...contracts,
    randomnessSender: liveSender ?? contracts.randomnessSender,
    randomnessReceiver: liveReceiver ?? contracts.randomnessReceiver,
  };

  return (
    <div className="mt-2">
      <p className="micro mb-3">Deployed contracts · {chainConfig.name}</p>

      <div className="glass-card overflow-x-auto rounded-[18px]">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[rgb(var(--line-rgb)_/_0.08)]">
              <th scope="col" className="micro px-4 py-3 font-medium">Contract</th>
              <th scope="col" className="micro px-4 py-3 font-medium">Responsibility</th>
              <th scope="col" className="micro px-4 py-3 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const address = resolved[row.key];
              const url = address ? explorerUrl("address", address) : null;

              return (
                <tr
                  key={row.key}
                  className="border-b border-[rgb(var(--line-rgb)_/_0.05)] last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                  <td className="px-4 py-3 text-[12.5px] text-ink-2">{row.role}</td>
                  <td className="px-4 py-3">
                    {address && url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="num inline-flex items-center gap-1.5 text-[12px] text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink"
                      >
                        {`${address.slice(0, 10)}…${address.slice(-8)}`}
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-[12px] text-ink-3">Not configured</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
        Source is verified on the explorer, so you can read the deployed code
        rather than take this page&rsquo;s word for what it does.
      </p>
    </div>
  );
}
