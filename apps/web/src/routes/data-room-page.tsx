import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import type { NodeDto, SessionUser } from "@data-room/shared";
import { Breadcrumbs } from "@/features/nodes/breadcrumbs";
import { DeleteDialog } from "@/features/nodes/delete-dialog";
import { NewFolderRow } from "@/features/nodes/new-folder-row";
import { NodeTable } from "@/features/nodes/node-table";
import { useMockNodeTree } from "@/features/nodes/use-mock-node-tree";

export function DataRoomPage() {
  useOutletContext<SessionUser>();
  const { id: folderId } = useParams<{ id: string }>();
  const tree = useMockNodeTree(folderId);

  // Stands in for the query's real pending state, so a folder switch renders
  // the loading skeleton instead of jumping straight to the new list.
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(timeout);
  }, [folderId]);

  const [deleteTarget, setDeleteTarget] = useState<NodeDto | null>(null);

  if (tree.notFound) {
    return (
      <div className="space-y-2 rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This folder doesn't exist, or it was deleted.
        </p>
        <a href="/" className="text-sm font-medium underline">
          Back to your Data Room
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs path={tree.breadcrumb} />
      <h1 className="text-xl font-semibold">{tree.currentFolder?.name}</h1>

      <NewFolderRow onCreate={tree.createFolder} />

      <NodeTable
        nodes={tree.children}
        isLoading={isLoading}
        errorMessage={null}
        onRename={tree.rename}
        onDelete={setDeleteTarget}
      />

      <DeleteDialog
        node={deleteTarget}
        stats={deleteTarget ? tree.subtreeStats(deleteTarget.id) : null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) tree.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
