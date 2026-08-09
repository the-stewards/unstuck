import Link from "next/link";

export function AppHeader({ email }: { email?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-foreground">
        UNSTUCK <span className="text-accent">·</span> Private Library
      </Link>
      {email && <span className="text-sm text-muted">{email}</span>}
    </header>
  );
}
