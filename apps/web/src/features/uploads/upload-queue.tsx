import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QueuedUpload } from "./use-mock-upload-queue";

const STATUS_LABEL: Record<QueuedUpload["status"], string> = {
  uploading: "Uploading…",
  done: "Uploaded",
  error: "",
  canceled: "Canceled",
};

export function UploadQueue({
  items,
  onCancel,
  onRetry,
  onDismiss,
}: {
  items: QueuedUpload[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2 rounded-md border p-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.name}</p>
            {item.status === "uploading" ? (
              <Progress value={item.progress} className="mt-1 h-1.5" />
            ) : (
              <p
                className={
                  item.status === "error" ? "text-destructive" : "text-muted-foreground"
                }
              >
                {item.status === "error" ? item.error : STATUS_LABEL[item.status]}
              </p>
            )}
          </div>

          {item.status === "uploading" && (
            <Button size="sm" variant="outline" onClick={() => onCancel(item.id)}>
              Cancel
            </Button>
          )}
          {item.status === "error" && (
            <Button size="sm" variant="outline" onClick={() => onRetry(item.id)}>
              Retry
            </Button>
          )}
          {item.status !== "uploading" && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Dismiss ${item.name}`}
              onClick={() => onDismiss(item.id)}
            >
              ×
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
