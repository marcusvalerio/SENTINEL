import type { FeaturePriority, FeatureStatus, ProgressSource } from "./project";
import { PRIORITY_WEIGHT, type MilestoneStatus } from "./milestones";

/**
 * Project progress — completion of real project elements.
 *
 * Deliberately NOT an input: commits, pull requests or any GitHub activity.
 * Activity tells us work is happening; progress tells us how much of the
 * intended project exists. Keeping them apart is a product rule.
 */

export type ProgressFeature = { status: FeatureStatus; priority: FeaturePriority; milestoneId?: string | null };
export type ProgressMilestone = { id: string; status: MilestoneStatus; priority: FeaturePriority };

const IN_PROGRESS_CREDIT = 0.35;

/** Share of weighted features done (in-progress features earn partial credit). */
export function featureProgress(features: Pick<ProgressFeature, "status" | "priority">[]) {
  if (features.length === 0) return 0;
  let total = 0;
  let done = 0;
  for (const f of features) {
    const w = PRIORITY_WEIGHT[f.priority];
    total += w;
    done += f.status === "done" ? w : f.status === "in_progress" ? w * IN_PROGRESS_CREDIT : 0;
  }
  return Math.round((done / total) * 100);
}

/**
 * A milestone's own completion: its linked features when it has any,
 * otherwise its status (completed = 100, active = partial credit).
 */
export function milestoneProgress(milestone: ProgressMilestone, features: ProgressFeature[]) {
  if (milestone.status === "completed") return 100;
  const own = features.filter((f) => f.milestoneId === milestone.id);
  if (own.length > 0) return featureProgress(own);
  return milestone.status === "active" ? Math.round(IN_PROGRESS_CREDIT * 100) : 0;
}

/** Weighted average of milestones, ignoring cancelled ones. */
export function milestonesProgress(milestones: ProgressMilestone[], features: ProgressFeature[]) {
  const counted = milestones.filter((m) => m.status !== "cancelled");
  if (counted.length === 0) return 0;
  let total = 0;
  let sum = 0;
  for (const m of counted) {
    const w = PRIORITY_WEIGHT[m.priority];
    total += w;
    sum += milestoneProgress(m, features) * w;
  }
  return Math.round(sum / total);
}

export function computeProgress(
  source: ProgressSource,
  input: { manual: number; features: ProgressFeature[]; milestones: ProgressMilestone[] },
) {
  if (source === "manual") return Math.max(0, Math.min(100, Math.round(input.manual)));
  if (source === "milestones") return milestonesProgress(input.milestones, input.features);
  return featureProgress(input.features);
}
