import { redirect } from "next/navigation";
import { sanitizeRef } from "@/lib/ref";

// No public marketing homepage — Brilliant Directors handles that.
// This subdomain is the app itself; landing here always means "sign in."
// ?ref=meta / ?ref=ig is carried through to the login page so the channel isn't lost.
export default async function Home({ searchParams }: PageProps<"/">) {
  const ref = sanitizeRef((await searchParams).ref);
  redirect(ref ? `/login?ref=${ref}` : "/login");
}
