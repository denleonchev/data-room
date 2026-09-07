import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  BreadcrumbDto,
  ChildStatsDto,
  ListNodesResponse,
  NodeDto,
} from "@data-room/shared";

const API_URL = import.meta.env.VITE_API_URL;

export type MutationResult = { ok: true } | { ok: false; error: string };

export interface SubtreeStats {
  folders: number;
  files: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(res.status, body?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const fetchDataRoom = () => request<NodeDto>("/data-room");

const fetchChildren = (parentId?: string) =>
  request<ListNodesResponse>(parentId ? `/nodes?parentId=${parentId}` : "/nodes");

const fetchBreadcrumb = (id: string) =>
  request<BreadcrumbDto[]>(`/nodes/${id}/breadcrumb`);

const fetchSubtreeStats = (id: string) =>
  request<SubtreeStats>(`/nodes/${id}/subtree-stats`);

const fetchChildStats = (parentId?: string) =>
  request<ChildStatsDto[]>(
    parentId ? `/nodes/child-stats?parentId=${parentId}` : "/nodes/child-stats",
  );

const postFolder = (parentId: string, name: string) =>
  request<NodeDto>("/folders", {
    method: "POST",
    body: JSON.stringify({ parentId, name }),
  });

const patchRename = (id: string, name: string) =>
  request<NodeDto>(`/nodes/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });

const patchMove = (id: string, parentId: string) =>
  request<NodeDto>(`/nodes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ parentId }),
  });

const deleteNode = (id: string) => request<void>(`/nodes/${id}`, { method: "DELETE" });

export function useDataRoom() {
  return useQuery({ queryKey: ["data-room"], queryFn: fetchDataRoom });
}

// Keyed on the resolved node id (never the "root" special case) so it always
// matches what the mutations below invalidate — they only ever know the real
// id, not whether it happened to come from the route or from useDataRoom().
export function useNodeChildren(currentId?: string) {
  return useQuery({
    queryKey: ["nodes", currentId],
    queryFn: () => fetchChildren(currentId),
    enabled: !!currentId,
    // Holding the last folder's answer through the next one's flight keeps the
    // viewer's role — and so the buttons that depend on it — on screen while
    // navigating. Rows are a different matter: the caller shows them as loading.
    placeholderData: keepPreviousData,
  });
}

export function useBreadcrumb(folderId?: string) {
  return useQuery({
    queryKey: ["breadcrumb", folderId],
    queryFn: () => fetchBreadcrumb(folderId!),
    enabled: !!folderId,
    // The old trail for a moment beats no trail at all: going deeper it is a
    // prefix of the new one, so the line only ever grows.
    placeholderData: keepPreviousData,
  });
}

export function useSubtreeStats(nodeId?: string) {
  return useQuery({
    queryKey: ["subtree-stats", nodeId],
    queryFn: () => fetchSubtreeStats(nodeId!),
    enabled: !!nodeId,
  });
}

// A node added, removed or moved anywhere changes the numbers in listings the
// user may not have open — one cheap query each, so drop them all rather than
// work out which ancestor was affected.
export function invalidateChildStats(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "child-stats",
  });
}

// One request for the whole listing, keyed like useNodeChildren so the two
// invalidate together.
export function useChildStats(parentId?: string) {
  return useQuery({
    queryKey: ["child-stats", parentId],
    queryFn: () => fetchChildStats(parentId),
    enabled: !!parentId,
  });
}

export function useCreateFolder(currentFolderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => postFolder(currentFolderId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nodes", currentFolderId] });
      invalidateChildStats(queryClient);
    },
  });
}

export function useRenameNode(
  currentFolderId: string | undefined,
  roomId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => patchRename(id, name),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["nodes", currentFolderId] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "breadcrumb",
      });
      if (id === roomId) {
        queryClient.invalidateQueries({ queryKey: ["data-room"] });
      }
    },
  });
}

export function useMoveNode(currentFolderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string }) =>
      patchMove(id, parentId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["nodes", currentFolderId] });
      const previous = queryClient.getQueryData<ListNodesResponse>([
        "nodes",
        currentFolderId,
      ]);
      queryClient.setQueryData<ListNodesResponse>(["nodes", currentFolderId], (listing) =>
        listing && {
          ...listing,
          nodes: listing.nodes.filter((node) => node.id !== id),
        },
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["nodes", currentFolderId], context?.previous);
    },
    onSettled: (_data, _err, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: ["nodes", currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ["nodes", parentId] });
      invalidateChildStats(queryClient);
    },
  });
}

export function useDeleteNode(currentFolderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNode(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["nodes", currentFolderId] });
      const previous = queryClient.getQueryData<ListNodesResponse>([
        "nodes",
        currentFolderId,
      ]);
      queryClient.setQueryData<ListNodesResponse>(["nodes", currentFolderId], (listing) =>
        listing && {
          ...listing,
          nodes: listing.nodes.filter((node) => node.id !== id),
        },
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["nodes", currentFolderId], context?.previous);
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: ["nodes", currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ["subtree-stats", id] });
      invalidateChildStats(queryClient);
    },
  });
}
