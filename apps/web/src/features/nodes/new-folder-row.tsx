import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MutationResult } from "./use-node-tree";

export function NewFolderRow({
  isPending,
  onCreate,
}: {
  isPending: boolean;
  onCreate: (name: string) => Promise<MutationResult>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setIsOpen(false);
    setName("");
    setError(null);
  }

  async function submit() {
    setError(null);
    const result = await onCreate(name);
    if (result.ok) {
      close();
    } else {
      setError(result.error);
    }
  }

  if (!isOpen) {
    return (
      <div className="flex justify-end border-b py-2">
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          New folder
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 border-b py-2">
      <div className="flex-1">
        <Input
          autoFocus
          placeholder="Folder name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") close();
          }}
          disabled={isPending}
          className="h-8"
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Button size="sm" variant="outline" onClick={close} disabled={isPending}>
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
