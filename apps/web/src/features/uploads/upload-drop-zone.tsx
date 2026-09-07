import { useState, type DragEvent, type ReactNode } from "react";

export function UploadDropZone({
  onFilesSelected,
  children,
}: {
  onFilesSelected: (files: File[]) => void;
  children: ReactNode;
}) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {children}

      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-background/80 text-sm font-medium">
          Drop files to upload
        </div>
      )}
    </div>
  );
}
