import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import type { NodeDto } from "@data-room/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ApiError, useBreadcrumb, useNodeChildren } from "./use-node-tree";

export function MoveDialog({
  node,
  room,
  isMoving,
  onOpenChange,
  onConfirm,
}: {
  node: NodeDto | null;
  room: NodeDto | null;
  isMoving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (destinationId: string) => void;
}) {
  const [folderId, setFolderId] = useState<string | undefined>(undefined);

  // Opens on the file's current folder — the common case is moving into a
  // sibling, not starting the browse from the Data Room every time.
  useEffect(() => {
    if (node) setFolderId(node.parentId ?? room?.id);
  }, [node, room?.id]);

  const isRoot = folderId !== undefined && folderId === room?.id;
  const children = useNodeChildren(folderId);
  const breadcrumb = useBreadcrumb(isRoot ? undefined : folderId);
  const folders = (children.data ?? []).filter((child) => child.type === "FOLDER");
  const path = isRoot ? (room ? [room] : []) : (breadcrumb.data ?? []);

  // Another session deleted the folder we just browsed into — bounce back to
  // the Data Room instead of silently showing it as an empty folder.
  useEffect(() => {
    if (children.error instanceof ApiError && children.error.status === 404 && !isRoot) {
      toast.error("That folder no longer exists.");
      setFolderId(room?.id);
    }
  }, [children.error, isRoot, room?.id]);

  function handleOpenChange(open: boolean) {
    // Same guard as DeleteDialog: don't drop the dialog mid-move.
    if (isMoving) return;
    onOpenChange(open);
  }

  return (
    <Dialog open={node !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {node?.name}</DialogTitle>
        </DialogHeader>

        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            {path.map((entry, index) => {
              const isLast = index === path.length - 1;
              return (
                <Fragment key={entry.id}>
                  {index > 0 && <span aria-hidden="true">/</span>}
                  <li>
                    {isLast ? (
                      <span className="font-medium text-foreground">{entry.name}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFolderId(entry.id)}
                        className="transition-colors hover:text-foreground"
                      >
                        {entry.name}
                      </button>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>

        {children.isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((row) => (
              <div key={row} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No subfolders here.
          </div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setFolderId(folder.id)}
              >
                {folder.name}
              </Button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => folderId && onConfirm(folderId)}
            disabled={!folderId || isMoving}
            className="relative"
          >
            <span className={cn(isMoving && "opacity-0")}>Move here</span>
            {isMoving && (
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
