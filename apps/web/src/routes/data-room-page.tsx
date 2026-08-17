import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { NodeDto, SessionUser } from "@data-room/shared";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, type BreadcrumbEntry } from "@/features/nodes/breadcrumbs";
import { DeleteDialog } from "@/features/nodes/delete-dialog";
import { FileViewerDialog } from "@/features/files/file-viewer-dialog";
import { MoveDialog } from "@/features/nodes/move-dialog";
import { NewFolderRow } from "@/features/nodes/new-folder-row";
import { NodeTable } from "@/features/nodes/node-table";
import { ShareDialog } from "@/features/sharing/share-dialog";
import {
  ApiError,
  useBreadcrumb,
  useCreateFolder,
  useDataRoom,
  useDeleteNode,
  useMoveNode,
  useNodeChildren,
  useRenameNode,
  useSubtreeStats,
} from "@/features/nodes/use-node-tree";
import { UploadDropZone } from "@/features/uploads/upload-drop-zone";
import { UploadQueue } from "@/features/uploads/upload-queue";
import { useUploadQueue } from "@/features/uploads/use-upload-queue";

export function DataRoomPage() {
  useOutletContext<SessionUser>();
  const { id: folderId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const dataRoom = useDataRoom();
  const currentId = folderId ?? dataRoom.data?.id;

  const children = useNodeChildren(currentId);
  const breadcrumb = useBreadcrumb(folderId);

  const createFolder = useCreateFolder(currentId);
  const rename = useRenameNode(currentId, dataRoom.data?.id);
  const move = useMoveNode(currentId);
  const remove = useDeleteNode(currentId);

  const [deleteTarget, setDeleteTarget] = useState<NodeDto | null>(null);
  const subtreeStats = useSubtreeStats(deleteTarget?.id);

  const [moveTarget, setMoveTarget] = useState<NodeDto | null>(null);

  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(
    null,
  );

  const [viewingFile, setViewingFile] = useState<NodeDto | null>(null);

  const uploads = useUploadQueue(currentId);

  const notFound =
    (children.error instanceof ApiError && children.error.status === 404) ||
    (breadcrumb.error instanceof ApiError && breadcrumb.error.status === 404);

  // Tracks the last folder we know still exists, so a 404 that shows up while
  // the user is already looking at a folder (another tab deleted it) can send
  // them to its real parent instead of always bouncing to the root.
  const lastKnownParentId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (breadcrumb.data && breadcrumb.data.length > 0) {
      const parent = breadcrumb.data[breadcrumb.data.length - 2];
      lastKnownParentId.current = parent?.id;
    }
  }, [breadcrumb.data]);

  useEffect(() => {
    if (!notFound) return;
    toast.error("This folder no longer exists.");
    const parentId = lastKnownParentId.current;
    navigate(parentId ? `/folder/${parentId}` : "/", { replace: true });
  }, [notFound, navigate]);

  async function handleCreate(name: string) {
    try {
      await createFolder.mutateAsync(name);
      return { ok: true as const };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        return { ok: false as const, error: error.message };
      }
      throw error;
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      await rename.mutateAsync({ id, name });
      return { ok: true as const };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        return { ok: false as const, error: error.message };
      }
      throw error;
    }
  }

  async function confirmMove(destinationId: string) {
    if (!moveTarget) return;
    try {
      await move.mutateAsync({ id: moveTarget.id, parentId: destinationId });
      setMoveTarget(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // The destination itself is gone — nothing to keep the dialog open
        // for, unlike a name conflict the user could resolve by picking
        // another folder.
        toast.error("That destination no longer exists.");
        setMoveTarget(null);
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Couldn't move this file.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't delete this item.",
      );
    }
  }

  if (notFound) return null;

  const title = folderId ? breadcrumb.data?.at(-1)?.name : dataRoom.data?.name;
  const path: BreadcrumbEntry[] | undefined = folderId
    ? breadcrumb.data
    : dataRoom.data
      ? [dataRoom.data]
      : undefined;

  // /folder/:id now serves both my own subfolders and ones shared with me
  // (restricted grants merge into the same read path) — while the
  // breadcrumb root is still resolving, default to hiding write chrome
  // rather than flash it and then take it away.
  const isOwn =
    !folderId ||
    (breadcrumb.data !== undefined &&
      dataRoom.data !== undefined &&
      breadcrumb.data[0]?.id === dataRoom.data.id);

  const table = (
    <NodeTable
      nodes={children.data ?? []}
      isLoading={!currentId || children.isLoading}
      errorMessage={null}
      isRenamePending={rename.isPending}
      onRename={isOwn ? handleRename : undefined}
      onMove={isOwn ? setMoveTarget : undefined}
      onShare={isOwn ? setShareTarget : undefined}
      onDelete={isOwn ? setDeleteTarget : undefined}
      onOpenFile={setViewingFile}
    />
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        path={path ?? []}
        rootHref={isOwn ? "/" : `/folder/${path?.[0]?.id ?? ""}`}
      />
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {!isOwn && title && (
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            View only
          </span>
        )}
        {isOwn && currentId && title && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShareTarget({ id: currentId, name: title })}
          >
            Share
          </Button>
        )}
      </div>

      {isOwn && <NewFolderRow isPending={createFolder.isPending} onCreate={handleCreate} />}

      {isOwn && (
        <UploadQueue
          items={uploads.items}
          onCancel={uploads.cancel}
          onRetry={uploads.retry}
          onDismiss={uploads.dismiss}
        />
      )}

      {isOwn ? (
        <UploadDropZone onFilesSelected={uploads.addFiles}>{table}</UploadDropZone>
      ) : (
        table
      )}

      <DeleteDialog
        node={deleteTarget}
        stats={subtreeStats.data ?? null}
        isLoadingStats={subtreeStats.isLoading}
        isDeleting={remove.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <MoveDialog
        node={moveTarget}
        room={dataRoom.data ?? null}
        isMoving={move.isPending}
        onOpenChange={(open) => !open && setMoveTarget(null)}
        onConfirm={confirmMove}
      />

      <ShareDialog
        node={shareTarget}
        onOpenChange={(open) => !open && setShareTarget(null)}
      />

      <FileViewerDialog
        node={viewingFile}
        onOpenChange={(open) => !open && setViewingFile(null)}
      />
    </div>
  );
}
