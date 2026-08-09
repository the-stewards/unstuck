import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listAllBonuses } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";
import { BonusForm } from "@/components/BonusForm";

export default async function AdminBonusesPage() {
  const user = await requireAdmin();
  const bonuses = await listAllBonuses();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 lg:max-w-4xl">
        <Link
          href="/admin"
          className="font-heading text-base font-bold uppercase tracking-wide text-muted-light hover:text-accent"
        >
          ← Back to students
        </Link>

        <h1 className="mt-3 font-heading text-3xl font-bold uppercase leading-none tracking-tight text-foreground">
          Bonuses
        </h1>

        <div className="mt-6 flex flex-col gap-4">
          {bonuses.map((bonus) => (
            <BonusForm key={bonus.id} bonus={bonus} />
          ))}
        </div>

        <div className="mt-10">
          <p className="mb-2 font-heading text-base font-bold uppercase tracking-wide text-foreground">
            Add a bonus
          </p>
          <BonusForm />
        </div>
      </main>
    </div>
  );
}
