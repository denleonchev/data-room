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

// Stands in for the file's real bytes until the wire-up PR points this at a
// signed GET /files/:id/download-url instead — same "built against a local
// file" step every other UI PR in this project has taken.
const LOCAL_FILE_URL = "/sample.pdf";

const uploadedAtFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileViewerDialog({
  node,
  onOpenChange,
}: {
  node: NodeDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const canPreview = node?.mimeType === "application/pdf";

  return (
    <Dialog open={node !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{node?.name}</DialogTitle>
          <DialogDescription>
            {formatFileSize(node?.size ?? null)}
            {node && " · "}
            {node && `Uploaded ${uploadedAtFormatter.format(new Date(node.createdAt))}`}
          </DialogDescription>
        </DialogHeader>

        {canPreview ? (
          <iframe
            src={LOCAL_FILE_URL}
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
          <Button variant="outline" asChild>
            <a href={LOCAL_FILE_URL} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </Button>
          <Button asChild>
            <a href={LOCAL_FILE_URL} download={node?.name}>
              Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
