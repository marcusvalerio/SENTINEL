import {
  Archive,
  Bookmark,
  CircleHelp,
  Eye,
  Lightbulb,
  Scale,
  Sparkles,
  StickyNote,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { NOTE_TYPE_LABELS, type NoteType } from "@/domain/notes";
import { cn } from "@/lib/cn";

export const NOTE_ICONS: Record<NoteType, ReactNode> = {
  note: <StickyNote />,
  idea: <Lightbulb />,
  insight: <Sparkles />,
  observation: <Eye />,
  decision: <Scale />,
  question: <CircleHelp />,
  problem: <TriangleAlert />,
  meeting: <Users />,
  reference: <Bookmark />,
  discarded_idea: <Archive />,
};

/** Only a few types carry colour — decisions and problems must stand out in a long journal. */
const NOTE_TONES: Partial<Record<NoteType, string>> = {
  decision: "text-accent bg-accent-soft shadow-[inset_0_0_0_1px_rgb(215_196_133/0.2)]",
  problem: "text-danger bg-danger-soft shadow-[inset_0_0_0_1px_rgb(224_146_143/0.2)]",
  idea: "text-[#c9bde9] bg-[rgb(174_163_212/0.1)] shadow-[inset_0_0_0_1px_rgb(174_163_212/0.2)]",
  insight: "text-info bg-identity shadow-[inset_0_0_0_1px_rgb(147_166_216/0.2)]",
  discarded_idea: "text-fg-subtle bg-surface-2 shadow-[inset_0_0_0_1px_var(--color-line)] line-through decoration-fg-subtle/50",
};

export function NoteTypeTag({ type, className }: { type: NoteType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5.5 items-center gap-1.5 rounded-xs px-1.5 text-caption font-medium tracking-normal whitespace-nowrap [&_svg]:size-3",
        NOTE_TONES[type] ?? "bg-surface-2 text-fg-muted shadow-[inset_0_0_0_1px_var(--color-line)]",
        className,
      )}
    >
      {NOTE_ICONS[type]}
      {NOTE_TYPE_LABELS[type]}
    </span>
  );
}
