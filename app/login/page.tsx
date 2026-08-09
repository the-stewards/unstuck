import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const hasInvalidLinkError = params.error === "invalid_link";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-widest text-accent">Private Library</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Enter UNSTUCK</h1>
        <p className="mt-2 text-sm text-muted">
          Just for attendees who acted before we closed the doors. Enter your email — we&apos;ll
          send a link straight in, no password needed.
        </p>

        {hasInvalidLinkError && (
          <p className="mt-4 rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            That link didn&apos;t work — it may have expired or already been used. Request a new
            one below.
          </p>
        )}

        <LoginForm />
      </div>
    </main>
  );
}
