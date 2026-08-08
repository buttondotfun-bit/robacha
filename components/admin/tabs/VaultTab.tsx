"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { fmtToken, type VaultToken } from "@/lib/use-admin-state";
import { cn } from "@/lib/utils";
import type { AdminTabProps } from "../types";
import { AdminSection, type OpStatus, Sk, StatusBadge } from "../ui";

function tokenStatus(t: VaultToken): { status: OpStatus; label: string } {
  if (!t.solvent) return { status: "critical", label: "Short" };
  if (t.balance === 0n) return { status: "warning", label: "Empty" };
  if (t.available === 0n) return { status: "warning", label: "Fully reserved" };
  return { status: "healthy", label: "Healthy" };
}

export function VaultTab({ s }: AdminTabProps) {
  const [open, setOpen] = useState<VaultToken | null>(null);
  const short = s.vaultTokens.filter((t) => !t.solvent).length;

  return (
    <div className="space-y-4">
      <AdminSection
        title="Prize vault"
        description="A spin that can't be paid in full is refunded instead. An empty vault doesn't break anything — it just stops paying that tier. 'Short' means the balance can't cover reserved payouts."
        action={
          s.vaultTokens.length > 0 ? (
            <span className="text-[11.5px] text-ink-3">
              {s.vaultTokens.length} assets · {short} short
            </span>
          ) : null
        }
      >
        {s.isLoading && s.vaultTokens.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} className="h-12 w-full rounded-[12px]" />
            ))}
          </div>
        ) : s.vaultTokens.length === 0 ? (
          <p className="text-[12.5px] text-ink-3">No reward tokens registered on the vault.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[12px]">
              <thead>
                <tr className="text-left text-ink-3">
                  <th className="pb-2 font-medium">Token</th>
                  <th className="pb-2 font-medium">Contract</th>
                  <th className="pb-2 text-right font-medium">Available</th>
                  <th className="pb-2 text-right font-medium">Reserved</th>
                  <th className="pb-2 text-right font-medium">Balance</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {s.vaultTokens.map((t) => {
                  const st = tokenStatus(t);
                  return (
                    <tr
                      key={t.address}
                      onClick={() => setOpen(t)}
                      className={cn(
                        "cursor-pointer border-t border-[rgb(var(--line-rgb)_/_0.07)] transition-colors hover:bg-[rgb(var(--ink-rgb)_/_0.02)]",
                        !t.solvent && "bg-[rgba(214,74,52,0.04)]",
                      )}
                    >
                      <td className="py-2.5 font-medium text-ink">
                        {t.symbol ? `$${t.symbol}` : shortAddress(t.address)}
                      </td>
                      <td className="num py-2.5 text-ink-3">{shortAddress(t.address)}</td>
                      <td className="num py-2.5 text-right text-ink-2">{fmtToken(t.available, t.decimals)}</td>
                      <td className="num py-2.5 text-right text-ink-2">{fmtToken(t.reserved, t.decimals)}</td>
                      <td className="num py-2.5 text-right font-medium text-ink">{fmtToken(t.balance, t.decimals)}</td>
                      <td className="py-2.5 text-right">
                        <StatusBadge status={st.status} label={st.label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <TokenDrawer token={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function TokenDrawer({
  token,
  onClose,
}: {
  token: VaultToken | null;
  onClose: () => void;
}) {
  if (!token) return null;
  const link = explorerUrl("token", token.address);
  const st = tokenStatus(token);

  return (
    <Dialog
      open={token !== null}
      onClose={onClose}
      title={token.symbol ? `$${token.symbol}` : "Reward token"}
      description="Balance and reservations read from the vault."
      variant="sheet"
    >
      <div className="space-y-4">
        <StatusBadge status={st.status} label={st.label} />

        <dl className="divide-y divide-[rgb(var(--line-rgb)_/_0.08)] overflow-hidden rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.1)]">
          <DRow label="Symbol" value={token.symbol ?? "—"} />
          <DRow label="Contract" value={token.address} mono />
          <DRow label="Decimals" value={String(token.decimals)} />
          <DRow label="Available" value={fmtToken(token.available, token.decimals)} />
          <DRow label="Reserved" value={fmtToken(token.reserved, token.decimals)} />
          <DRow label="Total balance" value={fmtToken(token.balance, token.decimals)} />
          <DRow label="Covers reserved" value={token.solvent ? "Yes" : "No — short"} />
        </dl>

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="num inline-flex items-center gap-1 text-[12px] text-ink-2 underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            View token on explorer
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}

        <p className="text-[11px] leading-relaxed text-ink-3">
          Reward ranges and pool weighting live in the pool version config, not on
          the vault; fund this token by transferring it to the vault contract.
          {!token.solvent
            ? " This token can't cover its reserved payouts — the tier it backs refunds instead of paying until it's funded."
            : ""}
        </p>
      </div>
    </Dialog>
  );
}

function DRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className={cn("text-right text-[12.5px] font-medium text-ink", mono && "num break-all")}>
        {value}
      </dd>
    </div>
  );
}
