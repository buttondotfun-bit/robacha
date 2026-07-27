"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { SpinProvider } from "@/lib/spin-store";
import { wagmiConfig } from "@/lib/web3";

/**
 * wagmi talks to Robinhood Chain mainnet; react-query caches the reads.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SpinProvider>{children}</SpinProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
