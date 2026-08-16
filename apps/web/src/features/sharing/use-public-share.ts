import { useQuery } from "@tanstack/react-query";
import type { BreadcrumbDto, NodeDto } from "@data-room/shared";
import { request } from "@/features/nodes/use-node-tree";

const fetchShareRoot = (token: string) => request<NodeDto>(`/s/${token}`);

const fetchShareChildren = (token: string, parentId?: string) =>
  request<NodeDto[]>(`/s/${token}/nodes${parentId ? `?parentId=${parentId}` : ""}`);

const fetchShareBreadcrumb = (token: string, nodeId: string) =>
  request<BreadcrumbDto[]>(`/s/${token}/nodes/${nodeId}/breadcrumb`);

export function useShareRoot(token: string | undefined) {
  return useQuery({
    queryKey: ["share-root", token],
    queryFn: () => fetchShareRoot(token!),
    enabled: !!token,
  });
}

export function useShareChildren(
  token: string | undefined,
  parentId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["share-children", token, parentId],
    queryFn: () => fetchShareChildren(token!, parentId),
    enabled: enabled && !!token,
  });
}

export function useShareBreadcrumb(
  token: string | undefined,
  nodeId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["share-breadcrumb", token, nodeId],
    queryFn: () => fetchShareBreadcrumb(token!, nodeId!),
    enabled: enabled && !!token && !!nodeId,
  });
}
