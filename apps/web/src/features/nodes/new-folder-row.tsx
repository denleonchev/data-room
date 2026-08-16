import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MutationResult } from "./use-mock-node-tree";

export function NewFolderRow({
  onCreate,
}: {
  onCreate: (name: string) => MutationResult;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setIsOpen(false);
    setName("");
    setError(null);
  }

  function submit() {
    const result = onCreate(name);
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
          className="h-8"
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Button size="sm" variant="outline" onClick={close}>
        Cancel
      </Button>
      <Button size="sm" onClick={submit}>
        Create
      </Button>
    </div>
  );
}
