import type { ReactNode } from "react";

import { DocsBreadcrumb } from "./DocsBreadcrumb";
import { DocsPager } from "./DocsPager";
import { DocsTOC } from "./DocsTOC";
import { Prose } from "./Prose";

interface DocsPageProps {
  pathname: string;
  children: ReactNode;
}

/**
 * Per-page wrapper:
 *   - <DocsBreadcrumb> at top
 *   - article + <Prose> in the center column
 *   - <DocsTOC> in the right rail (lg+) — discovers h2/h3 in the article
 *   - <DocsPager> below the article
 */
export function DocsPage({ pathname, children }: DocsPageProps) {
  return (
    <div className="flex gap-10">
      <div className="min-w-0 flex-1">
        <div className="mb-8">
          <DocsBreadcrumb pathname={pathname} />
        </div>
        <article data-docs-article>
          <Prose>{children}</Prose>
        </article>
        <DocsPager pathname={pathname} />
      </div>
      <DocsTOC />
    </div>
  );
}
