import type { Resource } from "@/lib/types";

const TYPE_LABEL: Record<Resource["type"], string> = {
  checklist: "Checklist",
  toolkit: "Toolkit",
  guide: "Guide",
  script: "Script",
};

// Companion resources render directly on the module page, not gated behind
// completion — they're part of what makes the module feel valuable up front.
export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <a
      href={resource.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-accent"
    >
      <div>
        <span className="text-xs uppercase tracking-wide text-accent">
          {TYPE_LABEL[resource.type]}
        </span>
        <h4 className="mt-1 font-medium text-foreground">{resource.title}</h4>
      </div>
      <span className="shrink-0 text-sm text-muted">Download</span>
    </a>
  );
}
