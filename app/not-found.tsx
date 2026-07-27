import Link from "next/link";
import { RobachaCapsuleRing } from "@/components/brand/RobachaLogo";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex flex-1 items-center justify-center px-4 py-24"
    >
      <div className="text-center">
        <RobachaCapsuleRing className="mx-auto" style={{ height: 48, width: 48 }} />
        <p className="micro mt-6">404</p>
        <h1 className="text-page-title mt-2.5">This capsule is empty.</h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-[14.5px] leading-relaxed text-ink-2">
          The page you were looking for is not part of the current rotation.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <ButtonLink href="/app" variant="primary" size="lg">
            Go to the pool
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" size="lg">
            Back home
          </ButtonLink>
        </div>
        <p className="mt-6 text-[12.5px] text-ink-3">
          Or read the{" "}
          <Link href="/faq" className="text-ink underline underline-offset-2">
            FAQ
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
