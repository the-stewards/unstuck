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
      className="flex items-center justify-between gap-4 border-t-[3px] border-foreground bg-card px-5 py-4 transition-colors hover:border-accent"
    >
      <div>
        <span className="font-heading text-base font-bold uppercase tracking-[0.3em] text-accent">
          {TYPE_LABEL[resource.type]}
        </span>
        <h4 className="mt-1 font-heading text-lg font-bold uppercase text-foreground">
          {resource.title}
        </h4>
      </div>
      <span className="shrink-0 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
        Download
      </span>
    </a>
  );
}
