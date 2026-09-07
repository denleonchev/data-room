import { useRef, type ChangeEvent, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

export function UploadButton({
  onFilesSelected,
  children = "Upload files",
  ...props
}: {
  onFilesSelected: (files: File[]) => void;
} & Omit<ComponentProps<typeof Button>, "onClick">) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      onFilesSelected(Array.from(event.target.files));
    }
    event.target.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf"
        onChange={handlePick}
        className="hidden"
      />
      <Button onClick={() => inputRef.current?.click()} {...props}>
        {children}
      </Button>
    </>
  );
}
