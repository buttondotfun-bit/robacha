import { Footer } from "@/components/app-shell/Footer";
import { SiteHeader } from "@/components/app-shell/SiteHeader";
import { AmbientBackground } from "@/components/shared/AmbientBackground";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AmbientBackground />
      <SiteHeader />
      {/* Clears the floating navbar, which is fixed. */}
      <main id="main" className="flex-1 pt-24 sm:pt-28">
        {children}
      </main>
      <Footer />
    </>
  );
}
