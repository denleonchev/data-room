import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function UploadDropZone({
  onFilesSelected,
  children,
}: {
  onFilesSelected: (files: File[]) => void;
  children: ReactNode;
}) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    if (event.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(event.dataTransfer.files));
    }
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      onFilesSelected(Array.from(event.target.files));
    }
    event.target.value = "";
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      <div className="mb-2 flex justify-end">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          onChange={handlePick}
          className="hidden"
        />
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          Upload files
        </Button>
      </div>

      {children}

      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-background/80 text-sm font-medium">
          Drop files to upload
        </div>
      )}
    </div>
  );
}
