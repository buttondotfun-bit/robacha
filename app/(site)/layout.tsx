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
      {/* Clears the floating navbar, which is fixed. Matches the product
          layout so the header sits identically on every page. */}
      <main id="main" className="flex-1 pt-[76px] sm:pt-[84px]">
        {children}
      </main>
      <Footer />
    </>
  );
}
