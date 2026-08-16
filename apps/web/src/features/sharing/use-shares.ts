import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShareDto } from "@data-room/shared";
import { request } from "@/features/nodes/use-node-tree";

const fetchShares = (nodeId: string) => request<ShareDto[]>(`/shares?nodeId=${nodeId}`);

const postShare = (nodeId: string) =>
  request<ShareDto>("/shares", { method: "POST", body: JSON.stringify({ nodeId }) });

const deleteShare = (id: string) => request<void>(`/shares/${id}`, { method: "DELETE" });

export function useShares(nodeId: string | undefined) {
  return useQuery({
    queryKey: ["shares", nodeId],
    queryFn: () => fetchShares(nodeId!),
    enabled: !!nodeId,
  });
}

export function useCreateShare(nodeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postShare(nodeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", nodeId] });
    },
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
