import type { Metadata } from "next";
import { AdminClient } from "@/components/admin/AdminClient";

/**
 * Operator console.
 *
 * Not linked from any navigation. That is not the access control — every
 * privileged call is enforced by `onlyRole` on chain, and the page itself
 * checks `hasRole` before rendering anything — it just keeps an operator tool
 * out of a product surface where it would only confuse people.
 */
export const metadata: Metadata = {
  // The root layout appends the brand; naming it here too doubled it.
  title: "Admin | Robacha",
  description: "Operator console. Access is verified against contract roles.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function AdminPage() {
  return <AdminClient />;
}
