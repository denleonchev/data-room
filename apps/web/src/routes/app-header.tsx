import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { SessionUser } from "@data-room/shared";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function AppHeader({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await authClient.signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
        <span className="font-semibold">Bonadev Data Room</span>
        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut} disabled={pending}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
