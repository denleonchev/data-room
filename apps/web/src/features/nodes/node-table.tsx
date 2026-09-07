import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, FileText, Folder, MoreVertical, X } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { NodeDto } from "@data-room/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MutationResult } from "./use-node-tree";

const columnHelper = createColumnHelper<NodeDto>();

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function NodeIcon({ type }: { type: NodeDto["type"] }) {
  const Icon = type === "FOLDER" ? Folder : FileText;
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        type === "FOLDER" ? "text-primary" : "text-muted-foreground",
      )}
    />
  );
}

export function NodeTable({
  nodes,
  isLoading,
  errorMessage,
  isRenamePending,
  onRename,
  onMove,
  onShare,
  onDelete,
  onOpenFile,
  folderHref = (id) => `/folder/${id}`,
  emptyMessage = 'This folder is empty. Drag files here, or use "Upload files" above, to add some.',
}: {
  nodes: NodeDto[];
  isLoading: boolean;
  errorMessage: string | null;
  isRenamePending: boolean;
  onRename?: (id: string, name: string) => Promise<MutationResult>;
  onMove?: (node: NodeDto) => void;
  onShare?: (node: NodeDto) => void;
  onDelete?: (node: NodeDto) => void;
  onOpenFile: (node: NodeDto) => void;
  folderHref?: (id: string) => string;
  emptyMessage?: string;
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
    if (!onRename) return;
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
              <div className="flex items-center gap-2">
                <NodeIcon type={node.type} />
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
              </div>
              {renameError && (
                <p className="mt-1 text-xs text-destructive">{renameError}</p>
              )}
            </div>
          );
        }
        if (node.status === "PENDING") {
          return (
            <span className="flex items-center gap-2 text-muted-foreground">
              <NodeIcon type={node.type} />
              {node.name}
            </span>
          );
        }
        if (node.type === "FOLDER") {
          return (
            <Link
              to={folderHref(node.id)}
              className="flex items-center gap-2 font-medium hover:underline"
            >
              <NodeIcon type={node.type} />
              {node.name}
            </Link>
          );
        }
        return (
          <button
            type="button"
            onClick={() => onOpenFile(node)}
            className="flex items-center gap-2 hover:underline"
          >
            <NodeIcon type={node.type} />
            {node.name}
          </button>
        );
      },
    }),
    columnHelper.accessor("size", {
      header: "Size",
      cell: ({ row, getValue }) => {
        const size = getValue();
        // Folders carry no size of their own; a subtree total goes here later.
        if (row.original.type === "FOLDER" || size === null) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span
            className={cn(row.original.status === "PENDING" && "text-muted-foreground")}
          >
            {formatFileSize(size)}
          </span>
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
            <div className="flex justify-end gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={cancelRename}
                disabled={isRenamePending}
                aria-label="Cancel rename"
                title="Cancel"
              >
                <X />
              </Button>
              <Button
                size="icon-sm"
                onClick={() => submitRename(node.id)}
                disabled={isRenamePending}
                aria-label="Save name"
                title="Save"
                className="relative"
              >
                <Check className={cn(isRenamePending && "opacity-0")} />
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
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${node.name}`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                )}
              >
                <MoreVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRename && (
                  <DropdownMenuItem onSelect={() => startRename(node)}>
                    Rename
                  </DropdownMenuItem>
                )}
                {onMove && (
                  <DropdownMenuItem onSelect={() => onMove(node)}>Move</DropdownMenuItem>
                )}
                {onShare && (
                  <DropdownMenuItem onSelect={() => onShare(node)}>Share</DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => onDelete(node)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table className="table-fixed">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  header.id === "size" && "w-24 text-right",
                  header.id === "updatedAt" && "w-32",
                  header.id === "actions" && "w-28",
                )}
              >
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
          <TableRow key={row.id} className="group">
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(cell.column.id === "size" && "text-right")}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
