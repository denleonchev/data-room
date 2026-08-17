import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { NodeDto, SessionUser } from "@data-room/shared";
import { FileViewerDialog } from "@/features/files/file-viewer-dialog";
import { NodeTable } from "@/features/nodes/node-table";
import { useSharedWithMe } from "@/features/sharing/use-shares";

export function SharedWithMePage() {
  useOutletContext<SessionUser>();
  const shared = useSharedWithMe();
  const [viewingFile, setViewingFile] = useState<NodeDto | null>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Shared with me</h1>

      <NodeTable
        nodes={shared.data ?? []}
        isLoading={shared.isLoading}
        errorMessage={null}
        isRenamePending={false}
        onOpenFile={setViewingFile}
        emptyMessage="Nothing has been shared with you yet."
      />

      <FileViewerDialog
        node={viewingFile}
        onOpenChange={(open) => !open && setViewingFile(null)}
      />
    </div>
  );
}
