import { CircleAlert, CircleCheck, CircleDashed, LoaderCircle } from "lucide-react";
import type { SyncStatus } from "@/domain/github-activity";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";

/** Never synced · Syncing · Synced 3 min ago · Failed — always with an icon, never color alone. */
export function SyncStatusLine({ status, lastSyncedAt, error, className }: { status: SyncStatus; lastSyncedAt: Date | string | null; error?: string | null; className?: string }) {
  const map = {
    never: { icon: <CircleDashed />, text: "Nunca sincronizado", tone: "text-fg-subtle" },
    syncing: { icon: <LoaderCircle className="animate-spin" />, text: "Sincronizando…", tone: "text-info" },
    success: { icon: <CircleCheck />, text: lastSyncedAt ? `Sincronizado ${formatRelative(lastSyncedAt)}` : "Sincronizado", tone: "text-success" },
    error: { icon: <CircleAlert />, text: "Última sincronização falhou", tone: "text-danger" },
  }[status];
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className={cn("flex items-center gap-1.5 text-body-sm [&_svg]:size-3.5", map.tone)} suppressHydrationWarning>
        {map.icon}
        {map.text}
        {status === "error" && lastSyncedAt && <span className="text-fg-subtle"> · dados de {formatRelative(lastSyncedAt)}</span>}
      </p>
      {status === "error" && error && <p className="text-caption tracking-normal text-fg-muted">{error}</p>}
    </div>
  );
}
