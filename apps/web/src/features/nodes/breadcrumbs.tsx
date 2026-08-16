import { Fragment } from "react";
import { Link } from "react-router-dom";
import type { NodeDto } from "@data-room/shared";
import { ROOT_ID } from "./mock-nodes";

export function Breadcrumbs({ path }: { path: NodeDto[] }) {
  if (path.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {path.map((node, index) => {
          const isLast = index === path.length - 1;
          return (
            <Fragment key={node.id}>
              {index > 0 && <span aria-hidden="true">/</span>}
              <li>
                {isLast ? (
                  <span className="font-medium text-foreground">{node.name}</span>
                ) : (
                  <Link
                    to={node.id === ROOT_ID ? "/" : `/folder/${node.id}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {node.name}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
