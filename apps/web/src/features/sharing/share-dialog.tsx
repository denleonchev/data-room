import { useState, type FormEvent } from "react";
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

function Spinner() {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </span>
  );
}

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

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  // useCreateShare/useRevokeShare are each one mutation instance shared by
  // several buttons ("Create link" vs "Invite", and every row's "Revoke") —
  // these track which specific click is the one actually in flight, so only
  // that button shows a spinner.
  const [creating, setCreating] = useState<"link" | "invite" | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const link = shares.data?.find((share) => share.mode === "PUBLIC_LINK") ?? null;
  const grants = shares.data?.filter((share) => share.mode === "RESTRICTED") ?? [];
  const url = link?.token ? `${window.location.origin}/s/${link.token}` : null;
  const isBusy = create.isPending || revoke.isPending;

  function handleOpenChange(open: boolean) {
    if (isBusy) return;
    onOpenChange(open);
    if (!open) {
      setInviteEmail("");
      setInviteError(null);
    }
  }

  async function handleCreateLink() {
    setCreating("link");
    try {
      await create.mutateAsync(undefined);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create the link.");
    } finally {
      setCreating(null);
    }
  }

  async function handleRevokeLink() {
    if (!link) return;
    setRevokingId(link.id);
    try {
      await revoke.mutateAsync(link.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't revoke the link.");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setInviteError(null);
    setCreating("invite");
    try {
      await create.mutateAsync(inviteEmail);
      setInviteEmail("");
    } catch (error) {
      setInviteError(
        error instanceof ApiError ? error.message : "Couldn't invite this email.",
      );
    } finally {
      setCreating(null);
    }
  }

  async function handleRevokeGrant(shareId: string) {
    setRevokingId(shareId);
    try {
      await revoke.mutateAsync(shareId);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't revoke access.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Dialog open={node !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {node?.name}</DialogTitle>
          <DialogDescription>
            Anyone with the link can view {node?.name}; people you invite by email can
            too, once they sign in.
          </DialogDescription>
        </DialogHeader>

        {shares.isLoading ? (
          <div className="space-y-2">
            <div className="h-9 animate-pulse rounded-md bg-muted" />
            <div className="h-9 animate-pulse rounded-md bg-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Public link</p>
              {url ? (
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
                  <Button
                    variant="outline"
                    className="relative text-destructive hover:text-destructive"
                    onClick={handleRevokeLink}
                    disabled={isBusy}
                  >
                    <span className={cn(revokingId === link?.id && revoke.isPending && "opacity-0")}>
                      Revoke
                    </span>
                    {revokingId === link?.id && revoke.isPending && <Spinner />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">No public link yet.</p>
                  <Button size="sm" onClick={handleCreateLink} disabled={isBusy} className="relative">
                    <span className={cn(creating === "link" && "opacity-0")}>Create link</span>
                    {creating === "link" && <Spinner />}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">People with access</p>
              <form onSubmit={handleInvite} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(event) => {
                      setInviteEmail(event.target.value);
                      setInviteError(null);
                    }}
                    disabled={isBusy}
                    className="h-9"
                  />
                  {inviteError && <p className="mt-1 text-xs text-destructive">{inviteError}</p>}
                </div>
                <Button type="submit" size="sm" disabled={isBusy || !inviteEmail} className="relative">
                  <span className={cn(creating === "invite" && "opacity-0")}>Invite</span>
                  {creating === "invite" && <Spinner />}
                </Button>
              </form>

              {grants.length > 0 && (
                <ul className="space-y-1">
                  {grants.map((grant) => (
                    <li key={grant.id} className="flex items-center justify-between text-sm">
                      <span>{grant.granteeEmail}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="relative text-destructive hover:text-destructive"
                        onClick={() => handleRevokeGrant(grant.id)}
                        disabled={isBusy}
                      >
                        <span className={cn(revokingId === grant.id && revoke.isPending && "opacity-0")}>
                          Revoke
                        </span>
                        {revokingId === grant.id && revoke.isPending && <Spinner />}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isBusy}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
