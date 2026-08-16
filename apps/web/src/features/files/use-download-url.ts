import { useQuery } from "@tanstack/react-query";
import { request } from "@/features/nodes/use-node-tree";

// Under the server's 60s TTL (apps/api/src/files/file.service.ts), so the
// viewer always has a fresh URL in place before the old one expires, rather
// than reacting to a broken preview after the fact.
const REFRESH_INTERVAL_MS = 45_000;

export function useDownloadUrl(
  nodeId: string | undefined,
  enabled: boolean,
  token?: string,
) {
  return useQuery({
    queryKey: ["download-url", nodeId, token],
    queryFn: () =>
      request<{ downloadUrl: string }>(
        token
          ? `/s/${token}/files/${nodeId}/download-url`
          : `/files/${nodeId}/download-url`,
      ),
    enabled: enabled && !!nodeId,
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: 0,
  });
}
