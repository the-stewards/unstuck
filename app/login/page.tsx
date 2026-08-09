export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-widest text-accent">Private Library</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Enter UNSTUCK</h1>
        <p className="mt-2 text-sm text-muted">
          Just for attendees who acted before we closed the doors. Enter your email — we&apos;ll
          send a link straight in, no password needed.
        </p>

        {/* form action={requestMagicLink} wired in Phase 4 */}
        <form className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="you@email.com"
            required
            className="rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Send my login link
          </button>
        </form>

        <p className="mt-4 text-xs text-muted">
          Link not showing up? Check spam, or resend it from here once you&apos;ve requested one.
        </p>
      </div>
    </main>
  );
}
