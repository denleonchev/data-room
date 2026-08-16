import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { NodeDto } from "@data-room/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { MutationResult } from "./use-node-tree";

const columnHelper = createColumnHelper<NodeDto>();

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function NodeTable({
  nodes,
  isLoading,
  errorMessage,
  isRenamePending,
  onRename,
  onMove,
  onDelete,
  onOpenFile,
}: {
  nodes: NodeDto[];
  isLoading: boolean;
  errorMessage: string | null;
  isRenamePending: boolean;
  onRename: (id: string, name: string) => Promise<MutationResult>;
  onMove: (node: NodeDto) => void;
  onDelete: (node: NodeDto) => void;
  onOpenFile: (node: NodeDto) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  function startRename(node: NodeDto) {
    setEditingId(node.id);
    setDraftName(node.name);
    setRenameError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setRenameError(null);
  }

  async function submitRename(id: string) {
    setRenameError(null);
    const result = await onRename(id, draftName);
    if (result.ok) {
      setEditingId(null);
      setRenameError(null);
    } else {
      setRenameError(result.error);
    }
  }

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ row }) => {
        const node = row.original;
        if (editingId === node.id) {
          return (
            <div>
              <Input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitRename(node.id);
                  if (event.key === "Escape") cancelRename();
                }}
                disabled={isRenamePending}
                className="h-8"
              />
              {renameError && (
                <p className="mt-1 text-xs text-destructive">{renameError}</p>
              )}
            </div>
          );
        }
        if (node.status === "PENDING") {
          return <span className="text-muted-foreground">{node.name}</span>;
        }
        if (node.type === "FOLDER") {
          return (
            <Link to={`/folder/${node.id}`} className="font-medium hover:underline">
              {node.name}
            </Link>
          );
        }
        return (
          <button
            type="button"
            onClick={() => onOpenFile(node)}
            className="font-medium hover:underline"
          >
            {node.name}
          </button>
        );
      },
    }),
    columnHelper.accessor("updatedAt", {
      header: "Updated",
      cell: ({ row, getValue }) =>
        row.original.status === "PENDING" ? (
          <span className="text-muted-foreground">Uploading…</span>
        ) : (
          <span className="text-muted-foreground">
            {dateFormatter.format(new Date(getValue()))}
          </span>
        ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const node = row.original;
        if (node.status === "PENDING") return null;
        if (editingId === node.id) {
          return (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={cancelRename}
                disabled={isRenamePending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => submitRename(node.id)}
                disabled={isRenamePending}
                className="relative"
              >
                <span className={cn(isRenamePending && "opacity-0")}>Save</span>
                {isRenamePending && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </span>
                )}
              </Button>
            </div>
          );
        }
        return (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => startRename(node)}>
              Rename
            </Button>
            {node.type === "FILE" && (
              <Button size="sm" variant="ghost" onClick={() => onMove(node)}>
                Move
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(node)}
            >
              Delete
            </Button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: nodes,
    columns,
    getRowId: (node) => node.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (errorMessage) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {errorMessage}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        This folder is empty. Drag files here, or use "Upload files" above, to add some.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
