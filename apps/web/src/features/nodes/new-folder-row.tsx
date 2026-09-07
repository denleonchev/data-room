import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MutationResult } from "./use-node-tree";

export function NewFolderRow({
  isOpen,
  isPending,
  onCreate,
  onClose,
}: {
  isOpen: boolean;
  isPending: boolean;
  onCreate: (name: string) => Promise<MutationResult>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError(null);
    }
  }, [isOpen]);

  async function submit() {
    setError(null);
    const result = await onCreate(name);
    if (result.ok) onClose();
    else setError(result.error);
  }

  if (!isOpen) return null;

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          autoFocus
          placeholder="Folder name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") onClose();
          }}
          disabled={isPending}
          className="h-8"
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Button size="sm" variant="outline" onClick={onClose} disabled={isPending}>
        Cancel
      </Button>
      <Button size="sm" onClick={submit} disabled={isPending} className="relative">
        <span className={cn(isPending && "opacity-0")}>Create</span>
        {isPending && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </span>
        )}
      </Button>
    </div>
  );
}
