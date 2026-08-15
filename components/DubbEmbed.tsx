import { SUPPORT_EMAIL } from "@/lib/support";

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
//
// The support line below is permanent, not conditional — Dubb gives no
// error/load event to detect a broken embed, so there's no way to tell a
// dead iframe from a slow one. Always showing the exit hatch is the only
// honest fallback available.
export function DubbEmbed({ embedHtml, title }: DubbEmbedProps) {
  return (
    <div>
      <div
        className="w-full overflow-hidden [&_iframe]:w-full"
        role="group"
        aria-label={title}
        dangerouslySetInnerHTML={{ __html: embedHtml }}
      />
      <p className="mt-2 font-body text-base text-muted">
        Video not loading?{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent underline">
          Email us
        </a>
        .
      </p>
    </div>
  );
}
