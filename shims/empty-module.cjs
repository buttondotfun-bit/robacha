/**
 * A stand-in for the optional `@x402/*` packages, which are not installed.
 *
 * They arrive purely transitively: AppKit's wagmi adapter imports the whole
 * `@wagmi/connectors` barrel, that pulls in Coinbase's Base Account connector,
 * that pulls in the CDP SDK, and the CDP SDK's x402 payment modules import
 * these. Nothing in this product touches x402 — the only wallet paths here are
 * the injected connector and WalletConnect — but the bundler still has to
 * resolve every specifier it can see, so an uninstalled optional peer fails the
 * build over code that never runs.
 *
 * CommonJS and a Proxy, rather than an ES module exporting nothing, and both
 * details are load-bearing. Turbopack statically verifies named imports against
 * an ES module, so an empty one turns "cannot resolve @x402/evm" into "export
 * toClientEvmSigner doesn't exist" — the same build failure wearing a different
 * hat. A CJS module has dynamically-known exports, which skips that check, and
 * the Proxy answers whatever name is asked for.
 *
 * Each answer is a function that throws. If any of this ever does end up on a
 * live code path it will say so loudly and name itself, which is what should
 * happen to code that is supposed to be unreachable. Returning undefined or a
 * silent no-op would let a payment path half-run instead.
 */
module.exports = new Proxy(
  {},
  {
    get(_target, property) {
      // Module-shape probes, not real usage: the interop layer and bundler ask
      // about these on every CJS module. Answering with a throwing function
      // would break the import itself.
      if (property === "__esModule") return false;
      if (property === "default") return module.exports;
      if (typeof property === "symbol") return undefined;

      return function unavailableX402Export() {
        throw new Error(
          `@x402 is not installed: something called "${String(property)}". ` +
            "ROBACHA does not use x402 payments — this module is a build shim " +
            "declared in next.config.ts, so reaching it means a wallet code " +
            "path changed and needs looking at.",
        );
      };
    },
  },
);
