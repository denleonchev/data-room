import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { NodeDto, SessionUser } from "@data-room/shared";
import { Breadcrumbs, type BreadcrumbEntry } from "@/features/nodes/breadcrumbs";
import { DeleteDialog } from "@/features/nodes/delete-dialog";
import { FileViewerDialog } from "@/features/files/file-viewer-dialog";
import { NewFolderRow } from "@/features/nodes/new-folder-row";
import { NodeTable } from "@/features/nodes/node-table";
import {
  ApiError,
  useBreadcrumb,
  useCreateFolder,
  useDataRoom,
  useDeleteNode,
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
  const remove = useDeleteNode(currentId);

  const [deleteTarget, setDeleteTarget] = useState<NodeDto | null>(null);
  const subtreeStats = useSubtreeStats(deleteTarget?.id);

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

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete this item.");
    }
  }

  if (notFound) return null;

  const title = folderId ? breadcrumb.data?.at(-1)?.name : dataRoom.data?.name;
  const path: BreadcrumbEntry[] | undefined = folderId
    ? breadcrumb.data
    : dataRoom.data
      ? [dataRoom.data]
      : undefined;

  return (
    <div className="space-y-4">
      <Breadcrumbs path={path ?? []} />
      <h1 className="text-xl font-semibold">{title}</h1>

      <NewFolderRow isPending={createFolder.isPending} onCreate={handleCreate} />

      <UploadQueue
        items={uploads.items}
        onCancel={uploads.cancel}
        onRetry={uploads.retry}
        onDismiss={uploads.dismiss}
      />

      <UploadDropZone onFilesSelected={uploads.addFiles}>
        <NodeTable
          nodes={children.data ?? []}
          isLoading={!currentId || children.isLoading}
          errorMessage={null}
          isRenamePending={rename.isPending}
          onRename={handleRename}
          onDelete={setDeleteTarget}
          onOpenFile={setViewingFile}
        />
      </UploadDropZone>

      <DeleteDialog
        node={deleteTarget}
        stats={subtreeStats.data ?? null}
        isLoadingStats={subtreeStats.isLoading}
        isDeleting={remove.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <FileViewerDialog
        node={viewingFile}
        onOpenChange={(open) => !open && setViewingFile(null)}
      />
    </div>
  );
}
