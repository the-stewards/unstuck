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
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Back to students
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-foreground">Bonuses</h1>

        <div className="mt-6 flex flex-col gap-4">
          {bonuses.map((bonus) => (
            <BonusForm key={bonus.id} bonus={bonus} />
          ))}
        </div>

        <div className="mt-10">
          <p className="mb-2 text-sm font-medium text-foreground">Add a bonus</p>
          <BonusForm />
        </div>
      </main>
    </div>
  );
}
