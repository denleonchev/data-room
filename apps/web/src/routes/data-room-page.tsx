import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { FolderOpen } from "lucide-react";
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
  useChildStats,
  useMoveNode,
  useNodeChildren,
  useRenameNode,
  useSubtreeStats,
} from "@/features/nodes/use-node-tree";
import { UploadButton } from "@/features/uploads/upload-button";
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
  const childStats = useChildStats(currentId);
  const remove = useDeleteNode(currentId);

  const [deleteTarget, setDeleteTarget] = useState<NodeDto | null>(null);
  const subtreeStats = useSubtreeStats(deleteTarget?.id);

  const [moveTarget, setMoveTarget] = useState<NodeDto | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

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
      const fallback =
        moveTarget.type === "FOLDER"
          ? "Couldn't move this folder."
          : "Couldn't move this file.";
      toast.error(error instanceof ApiError ? error.message : fallback);
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

  // /folder/:id serves both my own subfolders and ones shared with me, and the
  // listing says which — the write chrome appears with the rows it applies to,
  // not a request later.
  const isOwn = folderId ? children.data?.viewerRole === "OWNER" : true;

  const isListingReady = !children.isLoading && !children.isPlaceholderData;
  const isEmpty = (children.data?.nodes.length ?? 0) === 0;

  // The rows above the table keep their height, so filling them shifts nothing.
  const isOwnershipKnown = !folderId || children.data !== undefined;

  const emptyState = isOwn ? (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center">
      <FolderOpen className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">
          {folderId ? "This folder is empty" : "This data room is empty"}
        </p>
        <p className="text-sm text-muted-foreground">
          Drag PDFs here, or upload from your computer
        </p>
      </div>
      <UploadButton size="sm" onFilesSelected={uploads.addFiles} />
    </div>
  ) : undefined;

  const table = (
    <NodeTable
      nodes={children.data?.nodes ?? []}
      emptyState={emptyState}
      childStats={childStats.data}
      isLoading={!currentId || children.isLoading || children.isPlaceholderData}
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
      {/* At the root the breadcrumb would be the title repeated; inside a folder
          the breadcrumb's last entry is the title, so no heading either. */}
      <div className="flex min-h-7 items-center">
        {folderId ? (
          <Breadcrumbs
            path={path ?? []}
            rootHref={isOwn ? "/" : `/folder/${path?.[0]?.id ?? ""}`}
          />
        ) : (
          <h1 className="text-xl font-semibold">{title}</h1>
        )}
      </div>
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        {isOwnershipKnown && !isOwn && (
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            View only
          </span>
        )}
        {isOwnershipKnown && isOwn && currentId && (
          <>
            <UploadButton size="sm" onFilesSelected={uploads.addFiles} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreatingFolder(true)}
              disabled={isCreatingFolder}
            >
              New folder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShareTarget({ id: currentId, name: title ?? "" })}
            >
              Share
            </Button>
          </>
        )}
      </div>

      {isOwn && (
        <NewFolderRow
          isOpen={isCreatingFolder}
          isPending={createFolder.isPending}
          onCreate={handleCreate}
          onClose={() => setIsCreatingFolder(false)}
        />
      )}

      {isOwn && (
        <UploadQueue
          items={uploads.items}
          onCancel={uploads.cancel}
          onRetry={uploads.retry}
          onDismiss={uploads.dismiss}
        />
      )}

      {isOwn ? (
        <UploadDropZone onFilesSelected={uploads.addFiles}>
          {table}
          {isListingReady && !isEmpty && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Drag PDFs here to upload
            </p>
          )}
        </UploadDropZone>
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
