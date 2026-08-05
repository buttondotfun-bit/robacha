"use client";

import { createAppKit } from "@reown/appkit/react";
import {
  NETWORK_LABEL,
  REOWN_PROJECT_ID,
  robinhoodAppKitNetwork,
  wagmiAdapter,
} from "./web3";

/**
 * The wallet modal, created once.
 *
 * Lives in its own module rather than inside the provider so that importing it
 * is what creates it. `createAppKit` registers custom elements and global
 * state, so calling it per render would re-register them; module scope gives
 * exactly one call, and both the provider and `useWallet` can reach the same
 * instance.
 *
 * Guarded on the project id. Without one `createAppKit` throws on
 * construction, and since it runs at import time that would take the whole
 * provider tree down — turning a missing environment variable into a blank
 * site rather than a wallet button that cannot open. A misconfigured
 * deployment should still render, still read the chain, and still show
 * everything that does not need a wallet.
 */
const modal = REOWN_PROJECT_ID
  ? createAppKit({
      adapters: [wagmiAdapter],
      networks: [robinhoodAppKitNetwork],
      projectId: REOWN_PROJECT_ID,
      metadata: {
        name: "ROBACHA",
        description: `The memecoin gacha on ${NETWORK_LABEL}.`,
        // Wallets check this against the origin that opened the session, so it
        // has to be the real deployment rather than a placeholder.
        url: "https://www.robacha.fun",
        icons: ["https://www.robacha.fun/logo.png"],
      },
      // One chain, so a network selector would only be a dead control.
      allowUnsupportedChain: false,
      features: {
        analytics: false,
        // Email and social sign-in produce accounts this product does not want
        // to be responsible for. The whole promise is that the wallet is
        // yours and we cannot touch what is in it.
        email: false,
        socials: false,
      },
    })
  : null;

/**
 * Opening is safe to call unconditionally.
 *
 * When the modal could not be created there is nothing to open, and the caller
 * — a click handler on a button — should not have to know that. It resolves
 * quietly instead of throwing into an event handler where nothing would catch
 * it.
 */
export const appKitModal = {
  isConfigured: modal !== null,
  async open() {
    if (!modal) return;
    await modal.open();
  },
  async close() {
    if (!modal) return;
    await modal.close();
  },
};
