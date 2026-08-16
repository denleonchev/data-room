import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { SessionUser } from "@data-room/shared";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// Every destination the signed-in app has. Folders arrive under the same root in
// slice 2; "Shared with me" comes with permissioned sharing.
const NAV = [{ to: "/", label: "My Data Room", end: true }];

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
      <div className="mx-auto flex max-w-5xl items-center gap-6 p-4">
        <Link to="/" aria-label="Bonadev Data Room home">
          <Brand />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-4 text-sm">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "transition-colors hover:text-foreground",
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSignOut}
            disabled={pending}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
