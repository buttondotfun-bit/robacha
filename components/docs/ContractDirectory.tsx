import { ExternalLink } from "lucide-react";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";

/**
 * The deployed contracts, read from configuration rather than written down.
 *
 * If an address is not configured for this deployment the row says so instead
 * of showing a stale one — the docs can never claim a contract exists that the
 * running app is not actually pointed at.
 */

const ROWS: { key: keyof typeof contracts; name: string; role: string }[] = [
  { key: "gacha", name: "RobachaGacha", role: "Sells entries, settles rounds, holds escrow, pays claims" },
  { key: "poolRegistry", name: "RobachaPoolRegistry", role: "Pool versions, probabilities, reward slots, immutability" },
  { key: "rewardVault", name: "RobachaRewardVault", role: "Custodies reward inventory and tracks liabilities" },
  { key: "feeRouter", name: "RobachaFeeRouter", role: "Splits base payments, enforces caps and the fee timelock" },
  { key: "randomnessSender", name: "RobachaRandomnessSender", role: "Sends the randomness request to Ethereum over CCIP" },
  { key: "randomnessReceiver", name: "RobachaRandomnessReceiver", role: "Validates and delivers the returning VRF word" },
];

export function ContractDirectory() {
  return (
    <div className="mt-2">
      <p className="micro mb-3">Deployed contracts · {chainConfig.name}</p>

      <div className="glass-card overflow-x-auto rounded-[18px]">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[rgba(20,24,18,0.08)]">
              <th scope="col" className="micro px-4 py-3 font-medium">Contract</th>
              <th scope="col" className="micro px-4 py-3 font-medium">Responsibility</th>
              <th scope="col" className="micro px-4 py-3 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const address = contracts[row.key];
              const url = address ? explorerUrl("address", address) : null;

              return (
                <tr
                  key={row.key}
                  className="border-b border-[rgba(20,24,18,0.05)] last:border-b-0"
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
