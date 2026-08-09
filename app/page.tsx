import { redirect } from "next/navigation";

// No public marketing homepage — Brilliant Directories handles that.
// This subdomain is the app itself; landing here always means "sign in."
export default function Home() {
  redirect("/login");
}
