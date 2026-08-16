import { useState } from "react";
import { useParams } from "react-router-dom";
import type { NodeDto, SessionUser } from "@data-room/shared";
import { Breadcrumbs, type BreadcrumbEntry } from "@/features/nodes/breadcrumbs";
import { NodeTable } from "@/features/nodes/node-table";
import { FileViewerDialog } from "@/features/files/file-viewer-dialog";
import { ApiError } from "@/features/nodes/use-node-tree";
import { useSession } from "@/features/auth/use-session";
import {
  useShareBreadcrumb,
  useShareChildren,
  useShareRoot,
} from "@/features/sharing/use-public-share";
import { SiteHeader } from "./site-header";

function InvalidLinkNotice({ user }: { user: SessionUser | null }) {
  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          This link is no longer valid.
        </div>
      </main>
    </div>
  );
}

export function PublicSharePage() {
  const { token, nodeId } = useParams<{ token: string; nodeId?: string }>();
  const { user } = useSession();

  const root = useShareRoot(token);
  // Don't ask for a file's "children" — the endpoint 404s (a file can't be
  // listed), and that 404 would otherwise get mistaken for the whole link
  // being invalid before we've even confirmed the root is a folder.
  const isFolder = root.data?.type === "FOLDER";
  const currentId = nodeId ?? root.data?.id;
  const children = useShareChildren(token, currentId, isFolder);
  const breadcrumb = useShareBreadcrumb(token, nodeId ? currentId : undefined, isFolder);

  const [viewingFile, setViewingFile] = useState<NodeDto | null>(null);

  const notFound = [root.error, children.error, breadcrumb.error].some(
    (error) => error instanceof ApiError && error.status === 404,
  );
  if (notFound) return <InvalidLinkNotice user={user} />;

  // A share rooted on a single file has nothing else to browse — the viewer
  // is the whole page, and there's nowhere sensible for "Close" to go.
  if (root.data?.type === "FILE") {
    return (
      <div className="min-h-screen">
        <SiteHeader user={user} />
        <main className="mx-auto max-w-5xl p-6">
          <FileViewerDialog node={root.data} token={token} onOpenChange={() => {}} />
        </main>
      </div>
    );
  }

  const title = nodeId ? breadcrumb.data?.at(-1)?.name : root.data?.name;
  const path: BreadcrumbEntry[] | undefined = nodeId
    ? breadcrumb.data
    : root.data
      ? [root.data]
      : undefined;

  return (
    <div className="min-h-screen">
      <SiteHeader user={user} />
      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <Breadcrumbs
          path={path ?? []}
          rootHref={`/s/${token}`}
          folderHref={(id) => `/s/${token}/folder/${id}`}
        />
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{title}</h1>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            View only
          </span>
        </div>

        <NodeTable
          nodes={children.data ?? []}
          isLoading={!currentId || children.isLoading}
          errorMessage={null}
          isRenamePending={false}
          onOpenFile={setViewingFile}
          folderHref={(id) => `/s/${token}/folder/${id}`}
          emptyMessage="This folder is empty."
        />

        <FileViewerDialog
          node={viewingFile}
          token={token}
          onOpenChange={(open) => !open && setViewingFile(null)}
        />
      </main>
    </div>
  );
}
