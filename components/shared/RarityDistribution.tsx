import { formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/types/token";

export interface RarityBand {
  rarity: Rarity;
  label: string;
  /** Probability in percent, as published by the pool contract. */
  probability: number;
}

/**
 * Segmented pool distribution. Percentages are always written out next to the
 * bar so the chart never carries meaning through colour alone.
 *
 * Bands are supplied by the caller from contract state — this component holds
 * no odds of its own.
 */
export function RarityDistribution({
  bands,
  className,
  showLegend = true,
  height = 10,
}: {
  bands: RarityBand[];
  className?: string;
  showLegend?: boolean;
  height?: number;
}) {
  if (!bands.length) return null;

  return (
    <div className={className}>
      <div
        className="flex w-full gap-1 overflow-hidden"
        role="img"
        aria-label={`Pool distribution: ${bands
          .map((band) => `${band.label} ${formatPercent(band.probability, 0)}`)
          .join(", ")}`}
      >
        {bands.map((band) => (
          <div
            key={`${band.rarity}-${band.probability}`}
            data-rarity={band.rarity}
            style={{ width: `${band.probability}%`, height }}
            className="rarity-dot rounded-full"
          />
        ))}
      </div>

      {showLegend ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {bands.map((band) => (
            <li
              key={`${band.rarity}-${band.probability}`}
              data-rarity={band.rarity}
              className="flex items-center gap-1.5 text-[12px]"
            >
              <span
                className="rarity-dot h-1.5 w-1.5 rounded-full"
                aria-hidden="true"
              />
              <span className="text-ink-2">{band.label}</span>
              <span className="num text-ink">
                {formatPercent(band.probability, 0)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Compact inline odds row used in the app's top pool bar. */
export function RarityOddsRow({
  bands,
  className,
}: {
  bands: RarityBand[];
  className?: string;
}) {
  if (!bands.length) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {bands.map((band) => (
        <li
          key={`${band.rarity}-${band.probability}`}
          data-rarity={band.rarity}
          className="rarity-chip inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium"
        >
          <span
            className="rarity-dot h-1.5 w-1.5 rounded-full"
            aria-hidden="true"
          />
          <span>{band.label}</span>
          <span className="num opacity-75">
            {formatPercent(band.probability, 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}
