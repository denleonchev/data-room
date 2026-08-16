import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/features/nodes/use-node-tree";
import { cn } from "@/lib/utils";
import { useCreateShare, useRevokeShare, useShares } from "./use-shares";

export function ShareDialog({
  node,
  onOpenChange,
}: {
  node: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const shares = useShares(node?.id);
  const create = useCreateShare(node?.id);
  const revoke = useRevokeShare(node?.id);

  const share = shares.data?.[0] ?? null;
  const url = share?.token ? `${window.location.origin}/s/${share.token}` : null;
  const isPending = create.isPending || revoke.isPending;

  function handleOpenChange(open: boolean) {
    if (isPending) return;
    onOpenChange(open);
  }

  async function handleCreate() {
    try {
      await create.mutateAsync();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't create the link.",
      );
    }
  }

  async function handleRevoke() {
    if (!share) return;
    try {
      await revoke.mutateAsync(share.id);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't revoke the link.",
      );
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  }

  return (
    <Dialog open={node !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {node?.name}</DialogTitle>
          <DialogDescription>
            Anyone with the link can view {node?.name} and everything inside it.
          </DialogDescription>
        </DialogHeader>

        {shares.isLoading ? (
          <div className="h-9 animate-pulse rounded-md bg-muted" />
        ) : url ? (
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleCopy}>
              Copy
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not shared yet.</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Close
          </Button>
          {url ? (
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isPending}
              className="relative"
            >
              <span className={cn(revoke.isPending && "opacity-0")}>Revoke</span>
              {revoke.isPending && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </span>
              )}
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isPending} className="relative">
              <span className={cn(create.isPending && "opacity-0")}>Create link</span>
              {create.isPending && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </span>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
