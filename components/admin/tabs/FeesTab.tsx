"use client";

import { formatEther } from "viem";
import { ROBACHA_FEE_ROUTER_ABI } from "@/lib/abi";
import { chainConfig, contracts, explorerUrl } from "@/lib/config";
import { shortAddress } from "@/lib/formatters";
import { DangerousAction } from "../DangerousAction";
import type { AdminTabProps } from "../types";
import { AdminSection, EthAmount, Metric, Sk } from "../ui";

export function FeesTab({ s, refreshAll }: AdminTabProps) {
  const router = contracts.feeRouter;
  const available = s.fees.reduce((sum, f) => sum + (f.accrued ?? 0n), 0n);
  const anyUnreadable = s.fees.some((f) => f.accrued === null);

  return (
    <div className="space-y-4">
      <AdminSection
        title="Protocol fees"
        description="Fees accrue here and are withdrawn, never pushed. Addresses are deduplicated — several treasury roles often share one wallet, and summing per role would double-count."
      >
        {!router ? (
          <p className="text-[12.5px] text-ink-3">Fee router not configured.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric
                label="Available"
                value={<EthAmount wei={available} />}
                emphasis
                tooltip="Total accrued across every recipient, withdrawable now."
              />
              <Metric label="Recipients" value={String(s.fees.length)} />
              <Metric
                label="Withdrawn all-time"
                value="—"
                tooltip="Not tracked on the router; read the recipient wallets on the explorer for history."
              />
            </div>

            {s.isLoading && s.fees.length === 0 ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Sk key={i} className="h-14 w-full rounded-[12px]" />
                ))}
              </div>
            ) : s.fees.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-ink-3">No fee recipients configured.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {s.fees.map((f) => {
                  const link = explorerUrl("address", f.address);
                  const canWithdraw = f.accrued !== null && f.accrued > 0n;
                  return (
                    <li
                      key={f.address}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[rgb(var(--line-rgb)_/_0.08)] bg-[rgb(var(--ink-rgb)_/_0.02)] px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="num text-[14px] font-semibold text-ink">
                          {f.accrued === null ? "—" : <EthAmount wei={f.accrued} />}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-3">
                          {link ? (
                            <a href={link} target="_blank" rel="noreferrer" className="num underline decoration-dotted underline-offset-2 hover:text-ink-2">
                              {shortAddress(f.address)}
                            </a>
                          ) : (
                            <span className="num">{shortAddress(f.address)}</span>
                          )}{" "}
                          · {f.roles.join(" + ")}
                        </p>
                      </div>
                      {canWithdraw ? (
                        <DangerousAction
                          label="Withdraw"
                          triggerVariant="secondary"
                          title="Withdraw accrued fees?"
                          description="Sends this recipient's full accrued balance to its own address via the fee router."
                          reviewRows={[
                            { label: "Recipient", value: f.address, mono: true },
                            { label: "Amount", value: `${formatEther(f.accrued ?? 0n)} ${chainConfig.nativeSymbol}` },
                            { label: "Network", value: chainConfig.name },
                            { label: "Via", value: shortAddress(router), mono: true },
                          ]}
                          confirmWord="WITHDRAW"
                          warning="This moves real funds and cannot be reversed."
                          address={router}
                          abi={ROBACHA_FEE_ROUTER_ABI as never}
                          functionName="withdraw"
                          args={[f.address]}
                          onDone={refreshAll}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {anyUnreadable ? (
              <p className="mt-3 text-[11px] text-[#8a6a1c]">
                Some balances couldn&rsquo;t be read and show as —; retry from the header.
              </p>
            ) : null}
          </>
        )}
      </AdminSection>
    </div>
  );
}
