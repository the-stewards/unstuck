import { LoginForm } from "@/components/LoginForm";

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

        <LoginForm />
      </div>
    </main>
  );
}
