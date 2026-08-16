import { useEffect, useRef, useState } from "react";
import { findDuplicateNamesInBatch, uploadFileSchema } from "@data-room/shared";

export interface QueuedUpload {
  id: string;
  file: File;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error" | "canceled";
  error?: string;
}

const TICK_MS = 250;
const FAIL_NAME_PATTERN = /fail/i;
const FAIL_MESSAGE = "Upload failed — check your connection and retry.";

// Stands in for the real upload (XMLHttpRequest PUT to a signed URL, next PR)
// so cancel/retry/error are deliberate states here rather than whatever a
// live network happens to produce during a manual pass. A name matching
// /fail/i fails partway through on purpose, so that state is reproducible.
export function useMockUploadQueue() {
  const [items, setItems] = useState<QueuedUpload[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>());

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => clearInterval(timer));
      active.clear();
    };
  }, []);

  function startUpload(id: string, file: File) {
    const shouldFail = FAIL_NAME_PATTERN.test(file.name);
    const failAt = shouldFail ? 40 + Math.floor(Math.random() * 30) : null;

    const timer = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id || item.status !== "uploading") return item;

          const progress = Math.min(100, item.progress + 10 + Math.floor(Math.random() * 15));

          if (failAt !== null && progress >= failAt) {
            stopTimer(id);
            return { ...item, progress: failAt, status: "error", error: FAIL_MESSAGE };
          }
          if (progress >= 100) {
            stopTimer(id);
            return { ...item, progress: 100, status: "done" };
          }
          return { ...item, progress };
        }),
      );
    }, TICK_MS);

    timers.current.set(id, timer);
  }

  function stopTimer(id: string) {
    const timer = timers.current.get(id);
    if (timer) {
      clearInterval(timer);
      timers.current.delete(id);
    }
  }

  function addFiles(files: File[]) {
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

      startUpload(id, file);
      return { id, file, name: file.name, progress: 0, status: "uploading" };
    });

    setItems((prev) => [...prev, ...next]);
  }

  function cancel(id: string) {
    stopTimer(id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "canceled" } : item)),
    );
  }

  function retry(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    setItems((prev) =>
      prev.map((candidate) =>
        candidate.id === id
          ? { ...candidate, status: "uploading", progress: 0, error: undefined }
          : candidate,
      ),
    );
    startUpload(id, item.file);
  }

  function dismiss(id: string) {
    stopTimer(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return { items, addFiles, cancel, retry, dismiss };
}
