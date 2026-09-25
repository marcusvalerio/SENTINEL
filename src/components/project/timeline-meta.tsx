import {
  Archive,
  CircleCheck,
  CircleDot,
  CirclePause,
  CirclePlay,
  CircleX,
  Crosshair,
  Flag,
  FlagTriangleRight,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequestArrow,
  Lightbulb,
  PackageCheck,
  PencilRuler,
  Rocket,
  Scale,
  Sparkle,
  Sparkles,
  SquareCheckBig,
  StickyNote,
  Tag,
  TriangleAlert,
  Unplug,
  Waypoints,
} from "lucide-react";
import type { ReactNode } from "react";
import type { HistoryIcon } from "@/domain/history";
import type { TimelineOrigin } from "@/domain/timeline";

export const HISTORY_ICONS: Record<HistoryIcon, ReactNode> = {
  created: <Sparkle />,
  first_idea: <Lightbulb />,
  decision: <Scale />,
  scope_change: <PencilRuler />,
  milestone: <Flag />,
  deploy: <Rocket />,
  release: <PackageCheck />,
  status_change: <Waypoints />,
  paused: <CirclePause />,
  resumed: <CirclePlay />,
  completed: <SquareCheckBig />,
  archived: <Archive />,
  github_connected: <GitBranch />,
  github_disconnected: <Unplug />,
  note: <StickyNote />,
  goal_change: <Crosshair />,
  milestone_created: <FlagTriangleRight />,
  milestone_started: <CirclePlay />,
  milestone_completed: <CircleCheck />,
  milestone_paused: <CirclePause />,
  milestone_cancelled: <CircleX />,
  insight: <Sparkles />,
  problem: <TriangleAlert />,
  commit: <GitCommitHorizontal />,
  pull_request: <GitPullRequestArrow />,
  pull_request_merged: <GitMerge />,
  issue: <CircleDot />,
  issue_closed: <CircleCheck />,
  release_published: <Tag />,
};

/** Kept for v1 callers: event-type icons are a subset of history icons. */
export const TIMELINE_ICONS = HISTORY_ICONS;

export const TIMELINE_EMPHASIS: HistoryIcon[] = ["created", "milestone", "release", "completed", "decision", "first_idea", "milestone_completed", "release_published", "goal_change"];

/** Each origin carries a quiet hue so a long history can be scanned by source. */
export const ORIGIN_TONE: Record<TimelineOrigin, { dot: string; text: string; ring: string }> = {
  project: { dot: "bg-fg-muted", text: "text-fg-muted", ring: "shadow-[inset_0_0_0_1px_var(--color-line-3)]" },
  rubrica: { dot: "bg-accent", text: "text-accent", ring: "shadow-[inset_0_0_0_1px_rgb(215_196_133/0.4)]" },
  development: { dot: "bg-[#7fb0e8]", text: "text-[#9fc4ee]", ring: "shadow-[inset_0_0_0_1px_rgb(127_176_232/0.4)]" },
  milestone: { dot: "bg-success", text: "text-success", ring: "shadow-[inset_0_0_0_1px_rgb(134_185_156/0.4)]" },
};
