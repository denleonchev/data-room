import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NodeDto, ShareDto } from "@data-room/shared";
import { request } from "@/features/nodes/use-node-tree";

const fetchShares = (nodeId: string) => request<ShareDto[]>(`/shares?nodeId=${nodeId}`);

const postShare = (nodeId: string, granteeEmail?: string) =>
  request<ShareDto>("/shares", { method: "POST", body: JSON.stringify({ nodeId, granteeEmail }) });

const deleteShare = (id: string) => request<void>(`/shares/${id}`, { method: "DELETE" });

const fetchSharedWithMe = () => request<NodeDto[]>("/shares/shared-with-me");

export function useShares(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["shares", nodeId],
    queryFn: () => fetchShares(nodeId!),
    enabled: !!nodeId,
  });
}

// Serves both "create the public link" (no argument) and "invite by email"
// (with one) — same endpoint, same list to invalidate afterward.
export function useCreateShare(nodeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (granteeEmail?: string) => postShare(nodeId!, granteeEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", nodeId] });
    },
  });
}

export function useSharedWithMe() {
  return useQuery({
    queryKey: ["shared-with-me"],
    queryFn: fetchSharedWithMe,
  });
}

export function useRevokeShare(nodeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => deleteShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", nodeId] });
    },
  });
}
