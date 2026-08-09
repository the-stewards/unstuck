export default function PurchasePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-accent">Private Library — $47</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Get in before we close it.</h1>
        <p className="mt-3 text-sm text-muted">
          One-time $47 unlocks the full UNSTUCK library — every module, every companion resource,
          right now.
        </p>

        {/* Wired to /api/stripe/checkout in Phase 4 */}
        <button
          type="button"
          className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Get instant access — $47
        </button>

        <p className="mt-4 text-xs text-muted">
          Already purchased? Check your email for your login link, or head to{" "}
          <a href="/login" className="text-accent underline">
            /login
          </a>
          .
        </p>
      </div>
    </main>
  );
}
