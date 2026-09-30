import Link from "next/link";
import { getOrderBySessionId } from "@/lib/course";
import { PurchaseSuccessStatus } from "@/components/PurchaseSuccessStatus";

export default async function PurchaseSuccessPage({
  searchParams,
}: PageProps<"/purchase/success">) {
  const { session_id: sessionId } = await searchParams;

  if (typeof sessionId !== "string") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="font-heading text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
            No <span className="text-accent">order</span> found
          </h1>
          <hr className="mx-auto mt-4 w-16 border-t-2 border-accent" />
          <p className="mt-4 font-body text-lg font-light leading-relaxed text-muted">
            This link is missing your order details.{" "}
            <Link href="/purchase" className="text-accent underline">
              Head back to purchase
            </Link>{" "}
            or check your email if you already paid.
          </p>
        </div>
      </main>
    );
  }

  const order = await getOrderBySessionId(sessionId);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <PurchaseSuccessStatus
          sessionId={sessionId}
          initialFound={!!order}
          initialEmail={order?.email ?? null}
        />
      </div>
    </main>
  );
}
