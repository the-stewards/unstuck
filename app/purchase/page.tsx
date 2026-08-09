import { PurchaseButton } from "@/components/PurchaseButton";

export default async function PurchasePage({ searchParams }: PageProps<"/purchase">) {
  const params = await searchParams;
  const emailParam = params.email;
  const initialEmail = typeof emailParam === "string" ? emailParam : "";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="font-heading text-base font-bold uppercase tracking-[0.3em] text-muted-light">
          Private Library — $47
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
          Get in before we <span className="text-accent">close</span> it
        </h1>
        <hr className="mx-auto mt-4 w-16 border-t-2 border-accent" />
        <p className="mt-4 font-body text-lg font-light leading-relaxed text-muted">
          One-time $47 unlocks the full UNSTUCK library — every module, every companion resource,
          right now.
        </p>

        <PurchaseButton initialEmail={initialEmail} />

        <p className="mt-4 font-body text-base font-light text-muted">
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
