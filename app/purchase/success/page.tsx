import { getOrderBySessionId } from "@/lib/course";

export default async function PurchaseSuccessPage({
  searchParams,
}: PageProps<"/purchase/success">) {
  const { session_id: sessionId } = await searchParams;
  const order = typeof sessionId === "string" ? await getOrderBySessionId(sessionId) : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="font-heading text-base font-bold uppercase tracking-[0.3em] text-muted-light">
          You&apos;re in
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
          {order ? (
            <>
              Check your <span className="text-accent">email</span>
            </>
          ) : (
            <>
              Almost <span className="text-accent">there</span>
            </>
          )}
        </h1>
        <hr className="mx-auto mt-4 w-16 border-t-2 border-accent" />
        <p className="mt-4 font-body text-lg font-light leading-relaxed text-muted">
          {order
            ? `We've sent your login link to ${order.email}. It drops you straight into the library.`
            : "Your payment went through — we're finishing setting up your access. This usually takes a few seconds. Refresh if it's been a minute."}
        </p>
      </div>
    </main>
  );
}
