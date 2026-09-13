/**
 * ClarityPay logo — vector recreation of the supplied brand asset:
 * two interlocking blue discs, each with a rounded slot, forming an "S".
 * Appears ONLY where the lender legally must: wallet micro-tag, prequal
 * disclosure block, agreements/statements, and the merchant dashboard.
 */
export function ClarityPayLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden
      focusable="false"
    >
      <defs>
        <mask id="cp-slots">
          <rect width="200" height="200" fill="white" />
          {/* top disc: slot opening to the right */}
          <rect x="74" y="44" width="126" height="40" rx="20" fill="black" />
          {/* bottom disc: slot opening to the left */}
          <rect x="0" y="116" width="126" height="40" rx="20" fill="black" />
        </mask>
      </defs>
      <g mask="url(#cp-slots)" fill="#0A5CDB">
        <circle cx="76" cy="64" r="56" />
        <circle cx="124" cy="136" r="56" />
      </g>
    </svg>
  );
}

export function ClarityPayMark({
  size = "sm",
  muted = false,
}: {
  size?: "sm" | "md";
  muted?: boolean;
}) {
  const h = size === "md" ? 18 : 13;
  return (
    <span
      className="inline-flex items-center gap-1 align-middle"
      aria-label="ClarityPay"
    >
      <ClarityPayLogo size={h} />
      <span
        className="font-semibold tracking-tight"
        style={{
          color: muted ? "#64748b" : "#0A5CDB",
          fontSize: size === "md" ? 14 : 11,
          lineHeight: 1,
        }}
      >
        Clarity<span className="font-normal">Pay</span>
      </span>
    </span>
  );
}
