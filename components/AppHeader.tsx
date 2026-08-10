import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";

export function AppHeader({ email }: { email?: string }) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link
          href="/dashboard"
          className="font-heading text-base font-bold uppercase tracking-wide text-foreground"
        >
          UNSTUCK <span className="text-accent">·</span> Starter Kit
        </Link>
        {email && <span className="font-body text-base text-muted">{email}</span>}
      </header>
      <div className="flex justify-end px-6 py-2">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-body text-base text-muted-light hover:text-accent"
        >
          Need help?
        </a>
      </div>
    </>
  );
}
