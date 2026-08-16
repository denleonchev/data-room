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
import type { SubtreeStats } from "./use-mock-node-tree";

export function DeleteDialog({
  node,
  stats,
  onOpenChange,
  onConfirm,
}: {
  node: NodeDto | null;
  stats: SubtreeStats | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={node !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {node?.name}?</DialogTitle>
          <DialogDescription>{describe(node, stats)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
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
  if (!stats || (stats.folders === 0 && stats.files === 0)) {
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
