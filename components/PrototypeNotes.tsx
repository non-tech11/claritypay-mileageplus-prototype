"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, StickyNote } from "lucide-react";
import { PROTOTYPE_NOTES } from "@/lib/copy";

/**
 * Persistent collapsible drawer at the bottom of every customer screen —
 * the interviewer's voiceover: what product decision each screen shows.
 */
export function PrototypeNotes({ screen }: { screen: string }) {
  const [open, setOpen] = useState(false);
  const note = PROTOTYPE_NOTES[screen];
  if (!note) return null;

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-amber-200 bg-amber-50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-semibold text-amber-900"
      >
        <span className="flex items-center gap-1.5">
          <StickyNote size={13} aria-hidden /> Prototype notes
        </span>
        {open ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>
      {open && (
        <p className="px-4 pb-3 text-xs leading-relaxed text-amber-900">{note}</p>
      )}
    </div>
  );
}
