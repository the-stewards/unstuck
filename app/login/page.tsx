import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const hasInvalidLinkError = params.error === "invalid_link";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-heading text-base font-bold uppercase tracking-[0.3em] text-muted-light">
          Private Starter Kit
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
          Enter <span className="text-accent">UNSTUCK</span>
        </h1>
        <hr className="mt-4 w-16 border-t-2 border-accent" />
        <p className="mt-4 font-body text-lg font-light leading-relaxed text-muted">
          Just for attendees who acted before we closed the doors. Enter your email — we&apos;ll
          send a link straight in, no password needed.
        </p>

        {hasInvalidLinkError && (
          <p className="mt-4 border-l-4 border-red-700 bg-red-950/10 px-4 py-3 font-body text-base text-red-700">
            That link didn&apos;t work — it may have expired or already been used. Request a new
            one below.
          </p>
        )}

        <LoginForm />
      </div>
    </main>
  );
}
