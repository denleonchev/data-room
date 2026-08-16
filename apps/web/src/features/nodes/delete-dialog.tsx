import type { NodeDto } from "@data-room/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SubtreeStats } from "./use-node-tree";

export function DeleteDialog({
  node,
  stats,
  isLoadingStats,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  node: NodeDto | null;
  stats: SubtreeStats | null;
  isLoadingStats: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  // A file's description never depends on the subtree-stats fetch, so only a
  // folder target waits on it.
  const pendingStats = node?.type === "FOLDER" && isLoadingStats;

  function handleOpenChange(open: boolean) {
    // Escape / overlay click shouldn't drop the dialog while the delete is
    // still in flight — the mutation would finish with nothing showing it.
    if (isDeleting) return;
    onOpenChange(open);
  }

  return (
    <Dialog open={node !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {node?.name}?</DialogTitle>
          {pendingStats ? (
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          ) : (
            <DialogDescription>{describe(node, stats)}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={pendingStats || isDeleting}
            className="relative"
          >
            <span className={cn(isDeleting && "opacity-0")}>Delete</span>
            {isDeleting && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describe(node: NodeDto | null, stats: SubtreeStats | null) {
  if (!node) return "";
  if (node.type === "FILE") {
    return "This file will be permanently deleted.";
  }
  if (!stats) {
    return "This folder will be permanently deleted.";
  }
  if (stats.folders === 0 && stats.files === 0) {
    return "This folder is empty and will be permanently deleted.";
  }
  const parts = [
    stats.folders > 0 && pluralize(stats.folders, "folder"),
    stats.files > 0 && pluralize(stats.files, "file"),
  ].filter(Boolean);
  return `${parts.join(" and ")} will be permanently deleted along with this folder.`;
}

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
