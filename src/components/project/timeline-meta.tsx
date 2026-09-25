import {
  Archive,
  CirclePause,
  CirclePlay,
  Flag,
  GitBranch,
  Lightbulb,
  PackageCheck,
  PencilRuler,
  Rocket,
  Scale,
  Sparkle,
  SquareCheckBig,
  StickyNote,
  Unplug,
  Waypoints,
} from "lucide-react";
import type { ReactNode } from "react";
import type { TimelineEventType } from "@/domain/timeline";

export const TIMELINE_ICONS: Record<TimelineEventType, ReactNode> = {
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
};

export const TIMELINE_EMPHASIS: TimelineEventType[] = ["created", "milestone", "release", "completed", "decision", "first_idea"];
