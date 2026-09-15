import { BrandHeader } from "@/components/BrandHeader";
import { SpecOverlay } from "@/components/SpecOverlay";

/**
 * Mobile-width container (max 430px) centred on a soft grey backdrop so
 * the customer journey reads as a phone on desktop.
 */
export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-32px)] justify-center bg-slate-200/70 px-0 py-0 sm:px-4 sm:py-6">
      <div
        data-spec-frame
        className="flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-50 shadow-xl sm:rounded-2xl"
      >
        <BrandHeader />
        <main className="flex-1 px-4 pb-0 pt-4">{children}</main>
      </div>
      <SpecOverlay />
    </div>
  );
}
