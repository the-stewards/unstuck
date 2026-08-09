interface DubbEmbedProps {
  dubbUrl: string;
  title: string;
}

// Mirrors Dubb's own responsive embed markup (padding-bottom aspect-ratio
// trick, absolute-positioned iframe). No confirmed postMessage/JS event API
// from Dubb — see build-plan-lms.md — so this is a plain iframe with no
// completion-event wiring. Progress is tracked separately via the
// time-elapsed heuristic in the parent page, not anything from this embed.
export function DubbEmbed({ dubbUrl, title }: DubbEmbedProps) {
  return (
    <div className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
      <iframe
        className="absolute left-0 top-0 h-full w-full"
        src={dubbUrl}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        frameBorder={0}
      />
    </div>
  );
}
