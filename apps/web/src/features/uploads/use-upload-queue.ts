import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { findDuplicateNamesInBatch, uploadFileSchema } from "@data-room/shared";
import { ApiError, request } from "@/features/nodes/use-node-tree";

export interface QueuedUpload {
  id: string;
  file: File;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error" | "canceled";
  error?: string;
  nodeId?: string;
  bytesUploaded?: boolean;
}

const requestUploadUrl = (parentId: string, file: File) =>
  request<{ nodeId: string; signedUrl: string }>("/files/upload-url", {
    method: "POST",
    body: JSON.stringify({
      parentId,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }),
  });

const requestComplete = (nodeId: string) =>
  request<unknown>(`/files/${nodeId}/complete`, { method: "POST" });

const deleteNode = (nodeId: string) =>
  request<void>(`/nodes/${nodeId}`, { method: "DELETE" }).catch(() => {});

// A PUT straight to the signed URL, not the Supabase SDK's uploadToSignedUrl
// helper — that wraps fetch, which has no upload-progress event, and real
// per-file progress is the point. The xhr is returned so the caller can keep
// it around for cancel().
function putFile(url: string, file: File, onProgress: (percent: number) => void) {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload canceled", "AbortError"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
  return { promise, xhr };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong during the upload";
}

// Success and a deliberate cancel clear themselves out — nothing to act on.
// A failure stays until the user retries or dismisses it: silently vanishing
// would hide the one state that actually needs attention.
const AUTO_DISMISS_MS = 5000;

export function useUploadQueue(currentFolderId: string | undefined) {
  const [items, setItems] = useState<QueuedUpload[]>([]);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const autoDismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queryClient = useQueryClient();

  function updateItem(id: string, patch: Partial<QueuedUpload>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function scheduleAutoDismiss(id: string) {
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    autoDismissTimers.current.set(id, timer);
  }

  useEffect(() => {
    const activeXhrs = xhrs.current;
    const activeTimers = autoDismissTimers.current;
    return () => {
      activeXhrs.forEach((xhr) => xhr.abort());
      activeXhrs.clear();
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  async function startUpload(id: string, file: File, parentId: string) {
    try {
      const { nodeId, signedUrl } = await requestUploadUrl(parentId, file);
      updateItem(id, { nodeId });

      const { promise, xhr } = putFile(signedUrl, file, (progress) => updateItem(id, { progress }));
      xhrs.current.set(id, xhr);
      await promise;
      xhrs.current.delete(id);

      updateItem(id, { bytesUploaded: true, progress: 100 });
      await requestComplete(nodeId);
      updateItem(id, { status: "done" });
      scheduleAutoDismiss(id);
      queryClient.invalidateQueries({ queryKey: ["nodes", parentId] });
    } catch (error) {
      xhrs.current.delete(id);
      if (error instanceof DOMException && error.name === "AbortError") return;
      updateItem(id, { status: "error", error: errorMessage(error) });
    }
  }

  function addFiles(files: File[]) {
    if (!currentFolderId) return;
    const parentId = currentFolderId;

    const names = files.map((file) => file.name);
    const duplicated = findDuplicateNamesInBatch(names);
    const seen = new Set<string>();

    const next: QueuedUpload[] = files.map((file) => {
      const id = crypto.randomUUID();
      const isRepeat = duplicated.has(file.name) && seen.has(file.name);
      seen.add(file.name);

      if (isRepeat) {
        return {
          id,
          file,
          name: file.name,
          progress: 0,
          status: "error",
          error: "Another file in this drop already has this name",
        };
      }

      const result = uploadFileSchema.safeParse({
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });
      if (!result.success) {
        return {
          id,
          file,
          name: file.name,
          progress: 0,
          status: "error",
          error: result.error.issues[0]?.message ?? "This file can't be uploaded",
        };
      }

      void startUpload(id, file, parentId);
      return { id, file, name: file.name, progress: 0, status: "uploading" };
    });

    setItems((prev) => [...prev, ...next]);
  }

  function cancel(id: string) {
    xhrs.current.get(id)?.abort();
    xhrs.current.delete(id);

    const item = items.find((candidate) => candidate.id === id);
    setItems((prev) =>
      prev.map((candidate) => (candidate.id === id ? { ...candidate, status: "canceled" } : candidate)),
    );
    scheduleAutoDismiss(id);
    if (item?.nodeId) deleteNode(item.nodeId);
  }

  async function retry(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || !currentFolderId) return;
    const parentId = currentFolderId;

    if (item.bytesUploaded && item.nodeId) {
      updateItem(id, { status: "uploading", error: undefined });
      try {
        await requestComplete(item.nodeId);
        updateItem(id, { status: "done" });
        scheduleAutoDismiss(id);
        queryClient.invalidateQueries({ queryKey: ["nodes", parentId] });
      } catch (error) {
        updateItem(id, { status: "error", error: errorMessage(error) });
      }
      return;
    }

    if (item.nodeId) deleteNode(item.nodeId);
    updateItem(id, {
      status: "uploading",
      progress: 0,
      error: undefined,
      nodeId: undefined,
      bytesUploaded: false,
    });
    void startUpload(id, item.file, parentId);
  }

  function dismiss(id: string) {
    const timer = autoDismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      autoDismissTimers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return { items, addFiles, cancel, retry, dismiss };
}
