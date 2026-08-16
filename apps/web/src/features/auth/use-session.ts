import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionUser } from "@data-room/shared";

const API_URL = import.meta.env.VITE_API_URL;

export const sessionQueryKey = ["me"] as const;

async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch(`${API_URL}/me`, { credentials: "include" });
  // Signed out is an answer, not a failure — anything else is a real error.
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Could not load session: ${res.status}`);
  const { user } = (await res.json()) as { user: SessionUser };
  return user;
}

export function useSession() {
  const { data, isPending, isError } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    retry: false,
    staleTime: 30_000,
  });

  return { user: data ?? null, isPending, isError };
}

export function useRefreshSession() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: sessionQueryKey });
}
