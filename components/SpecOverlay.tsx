"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Engineering spec overlay. Any element carrying
 *   data-spec="Name|path/to/File.tsx|what it does"
 * gets a labelled callout in the whitespace beside the phone frame, with a
 * leader line back to the element. Off by default — it is a handover aid,
 * not part of the product — and toggled from the prototype toolbar.
 *
 * Reading positions from the live DOM (rather than hand-placing labels)
 * keeps the annotations correct as screens change.
 */

const EVENT = "cp-spec-toggle";
const STORAGE_KEY = "cp_spec_overlay";

export function toggleSpecOverlay(): boolean {
  const next = !isSpecOverlayOn();
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Storage unavailable — the overlay still toggles for this page view.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

export function isSpecOverlayOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface Callout {
  key: string;
  name: string;
  file: string;
  note: string;
  /** Viewport rect of the annotated element. */
  centerY: number;
  left: number;
  right: number;
  side: "left" | "right";
  /** Final label position after collision resolution. */
  labelY: number;
}

interface Gutters {
  /** Left edge of the left-hand label column. */
  leftX: number;
  /** Left edge of the right-hand label column. */
  rightX: number;
}

const LABEL_W = 260;
const MIN_GAP = 8;
const GUTTER = 16;

export function SpecOverlay() {
  const [on, setOn] = useState(false);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [gutters, setGutters] = useState<Gutters | null>(null);

  useEffect(() => {
    setOn(isSpecOverlayOn());
    const handler = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const measure = useCallback(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-spec]")
    );
    // The phone frame is the reference: labels sit outside it, alternating
    // sides so leader lines do not cross.
    const frame = document
      .querySelector<HTMLElement>("[data-spec-frame]")
      ?.getBoundingClientRect();
    if (!frame) {
      setCallouts([]);
      setGutters(null);
      return;
    }
    // The live API panel docks right on wide screens; stop short of it.
    const panel = document
      .querySelector<HTMLElement>('[aria-label="Live API calls"]')
      ?.getBoundingClientRect();
    const rightLimit = panel && panel.width > 0 ? panel.left : window.innerWidth;

    const roomLeft = frame.left >= LABEL_W + GUTTER * 2;
    const roomRight = rightLimit - frame.right >= LABEL_W + GUTTER * 2;
    if (!roomLeft && !roomRight) {
      setCallouts([]);
      setGutters(null);
      return;
    }
    // Labels hang off the frame edges, not the element edges, so a column
    // stays aligned and can never overlap the phone.
    setGutters({
      leftX: frame.left - GUTTER - LABEL_W,
      rightX: frame.right + GUTTER,
    });

    const raw: Callout[] = [];
    nodes.forEach((el, i) => {
      const spec = el.dataset.spec ?? "";
      const [name, file, note] = spec.split("|");
      if (!name) return;
      const r = el.getBoundingClientRect();
      if (r.height === 0 && r.width === 0) return;
      // Alternate sides when both are available, otherwise use the one
      // with room.
      const side: "left" | "right" =
        roomLeft && roomRight ? (i % 2 === 0 ? "left" : "right")
        : roomLeft ? "left"
        : "right";
      raw.push({
        key: `${name}-${i}`,
        name,
        file: file ?? "",
        note: note ?? "",
        centerY: r.top + r.height / 2,
        left: r.left,
        right: r.right,
        side,
        labelY: r.top + r.height / 2,
      });
    });

    // Push overlapping labels down so every callout stays readable.
    (["left", "right"] as const).forEach((side) => {
      const col = raw.filter((c) => c.side === side).sort((a, b) => a.centerY - b.centerY);
      let cursor = -Infinity;
      col.forEach((c) => {
        const estHeight = 46 + Math.ceil(c.note.length / 34) * 12;
        const y = Math.max(c.centerY - estHeight / 2, cursor + MIN_GAP);
        c.labelY = y;
        cursor = y + estHeight;
      });
    });

    setCallouts(raw);
  }, []);

  useEffect(() => {
    if (!on) {
      setCallouts([]);
      setGutters(null);
      return;
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    // Content can settle after data loads; re-measure shortly after mount.
    const t = setTimeout(measure, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [on, measure]);

  if (!on || !gutters || callouts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        {callouts.map((c) => {
          const labelEdge =
            c.side === "left" ? gutters.leftX + LABEL_W : gutters.rightX;
          const anchorX = c.side === "left" ? c.left : c.right;
          return (
            <g key={`line-${c.key}`}>
              <line
                x1={anchorX}
                y1={c.centerY}
                x2={labelEdge}
                y2={c.labelY + 14}
                stroke="#6366f1"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.7}
              />
              <circle cx={anchorX} cy={c.centerY} r={3} fill="#6366f1" />
            </g>
          );
        })}
      </svg>
      {callouts.map((c) => (
        <div
          key={c.key}
          className="absolute rounded-lg border border-indigo-300 bg-white/95 px-2.5 py-1.5 shadow-sm"
          style={{
            width: LABEL_W,
            top: c.labelY,
            left: c.side === "left" ? gutters.leftX : gutters.rightX,
          }}
        >
          <p className="text-[11px] font-bold leading-tight text-indigo-900">
            {c.name}
          </p>
          {c.file && (
            <p className="font-mono text-[9px] leading-tight text-indigo-500">
              {c.file}
            </p>
          )}
          {c.note && (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-600">
              {c.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
