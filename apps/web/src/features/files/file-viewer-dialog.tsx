import { useEffect } from "react";
import { toast } from "sonner";
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
import { ApiError } from "@/features/nodes/use-node-tree";
import { useDownloadUrl } from "./use-download-url";

const uploadedAtFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileViewerDialog({
  node,
  token,
  onOpenChange,
}: {
  node: NodeDto | null;
  token?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const isOpen = node !== null;
  const canPreview = node?.mimeType === "application/pdf";
  const download = useDownloadUrl(node?.id, isOpen && node?.status === "READY", token);
  const downloadUrl = download.data?.downloadUrl;

  // Same shape as the folder-deleted-while-viewing handling in
  // data-room-page.tsx: toast, then leave, rather than an inline
  // file-not-found state inside the dialog.
  useEffect(() => {
    if (download.error instanceof ApiError && download.error.status === 404) {
      toast.error("This file no longer exists.");
      onOpenChange(false);
    }
  }, [download.error, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{node?.name}</DialogTitle>
          <DialogDescription>
            {formatFileSize(node?.size ?? null)}
            {node && " · "}
            {node && `Uploaded ${uploadedAtFormatter.format(new Date(node.createdAt))}`}
          </DialogDescription>
        </DialogHeader>

        {!downloadUrl ? (
          <div className="h-[60vh] w-full animate-pulse rounded-md border bg-muted" />
        ) : canPreview ? (
          <iframe
            src={downloadUrl}
            title={node?.name}
            className="h-[60vh] w-full rounded-md border"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Preview not available for this file type.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {downloadUrl ? (
            <Button variant="outline" asChild>
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Open in new tab
            </Button>
          )}
          {downloadUrl ? (
            <Button asChild>
              <a href={downloadUrl} download={node?.name}>
                Download
              </a>
            </Button>
          ) : (
            <Button disabled>Download</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
