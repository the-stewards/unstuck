interface DubbEmbedProps {
  embedHtml: string;
  title: string;
}

// Renders Dubb's own embed snippet verbatim (admin pastes the full
// <div><iframe>...</iframe></div> block from Dubb, aspect-ratio wrapper
// included) rather than us reconstructing it from a bare URL. No confirmed
// postMessage/JS event API from Dubb — see build-plan-lms.md — so progress
// is still tracked separately via the time-elapsed heuristic in the parent
// page, not anything from this embed. Admin-only input (gated by
// requireAdminEmail), same trust boundary as the rest of the CMS.
export function DubbEmbed({ embedHtml, title }: DubbEmbedProps) {
  return (
    <div
      className="w-full overflow-hidden [&_iframe]:w-full"
      role="group"
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: embedHtml }}
    />
  );
}
