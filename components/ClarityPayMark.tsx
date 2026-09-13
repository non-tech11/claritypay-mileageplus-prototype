/**
 * ClarityPay wordmark (no external asset exists — drawn as inline SVG).
 * Appears ONLY where the lender legally must: wallet micro-tag, prequal
 * disclosure block, agreements/statements, and the merchant dashboard.
 */
export function ClarityPayMark({
  size = "sm",
  muted = false,
}: {
  size?: "sm" | "md";
  muted?: boolean;
}) {
  const h = size === "md" ? 18 : 12;
  const color = muted ? "#64748b" : "#4F46E5";
  return (
    <span
      className="inline-flex items-center gap-1 align-middle"
      aria-label="ClarityPay"
    >
      <svg
        width={h}
        height={h}
        viewBox="0 0 24 24"
        aria-hidden
        focusable="false"
      >
        <circle cx="12" cy="12" r="11" fill={color} />
        <path
          d="M16.5 9.2A5 5 0 1 0 16.5 14.8"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="font-semibold tracking-tight"
        style={{
          color,
          fontSize: size === "md" ? 14 : 11,
          lineHeight: 1,
        }}
      >
        Clarity<span className="font-normal">Pay</span>
      </span>
    </span>
  );
}
