import { getOrderBySessionId } from "@/lib/course";

export default async function PurchaseSuccessPage({
  searchParams,
}: PageProps<"/purchase/success">) {
  const { session_id: sessionId } = await searchParams;
  const order = typeof sessionId === "string" ? await getOrderBySessionId(sessionId) : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-accent">You&apos;re in</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {order ? "Check your email." : "Almost there — hang tight."}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {order
            ? `We've sent your login link to ${order.email}. It drops you straight into the library.`
            : "Your payment went through — we're finishing setting up your access. This usually takes a few seconds. Refresh if it's been a minute."}
        </p>
      </div>
    </main>
  );
}
