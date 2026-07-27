import { cn } from "@/lib/utils";

export function LoadingSkeleton({
  className,
  rounded = "12px",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{ borderRadius: rounded }}
      aria-hidden="true"
    />
  );
}

/** Card-shaped placeholder used by the reward grid and bag list. */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="glass-card rounded-[20px] p-3"
        >
          <LoadingSkeleton className="aspect-square w-full" />
          <LoadingSkeleton className="mt-3 h-3.5 w-2/3" />
          <LoadingSkeleton className="mt-2 h-3 w-1/3" />
          <LoadingSkeleton className="mt-4 h-8 w-full" rounded="10px" />
        </div>
      ))}
    </>
  );
}

export function RowSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <LoadingSkeleton className="h-9 w-9" rounded="10px" />
          <div className="min-w-0 flex-1">
            <LoadingSkeleton className="h-3 w-1/2" />
            <LoadingSkeleton className="mt-2 h-2.5 w-1/4" />
          </div>
          <LoadingSkeleton className="h-3 w-12" />
        </div>
      ))}
    </>
  );
}
