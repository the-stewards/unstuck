import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listStudentsWithProgress, getAdminStats, getAbandonedCheckouts } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";
import { AdminGrantForm } from "@/components/AdminGrantForm";
import { CallStatusSelect } from "@/components/CallStatusSelect";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default async function AdminPage() {
  const user = await requireAdmin();
  const [students, stats, abandonedCheckouts] = await Promise.all([
    listStudentsWithProgress(),
    getAdminStats(),
    getAbandonedCheckouts(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <nav className="flex gap-6 font-heading text-base font-bold uppercase tracking-wide">
          <Link href="/admin/modules" className="text-accent hover:underline">
            Modules
          </Link>
          <Link href="/admin/bonuses" className="text-accent hover:underline">
            Bonuses
          </Link>
          <Link href="/admin/testimonials" className="text-accent hover:underline">
            Testimonials
          </Link>
        </nav>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border-t-[3px] border-foreground bg-card px-4 py-4">
            <p className="font-heading text-[40px] font-bold leading-none text-accent">{stats.totalGranted}</p>
            <p className="mt-2 font-heading text-base font-bold uppercase tracking-wide text-muted-light">Granted</p>
            <p className="font-body text-base text-muted">
              {stats.totalPurchased} paid &middot; {stats.totalComped} comped
            </p>
          </div>
          <div className="border-t-[3px] border-foreground bg-card px-4 py-4">
            <p className="font-heading text-[40px] font-bold leading-none text-accent">{stats.startedCount}</p>
            <p className="mt-2 font-heading text-base font-bold uppercase tracking-wide text-muted-light">Started</p>
          </div>
          <div className="border-t-[3px] border-foreground bg-card px-4 py-4">
            <p className="font-heading text-[40px] font-bold leading-none text-accent">{stats.completedCount}</p>
            <p className="mt-2 font-heading text-base font-bold uppercase tracking-wide text-muted-light">Completed</p>
          </div>
          <div className="border-t-[3px] border-foreground bg-card px-4 py-4">
            <p className="font-heading text-[40px] font-bold leading-none text-accent">
              {formatCents(stats.revenueThisMonthCents)}
            </p>
            <p className="mt-2 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
              Revenue This Month
            </p>
            <p className="font-body text-base text-muted">{formatCents(stats.revenueAllTimeCents)} all-time</p>
          </div>
        </div>

        <h1 className="mt-10 font-heading text-3xl font-bold uppercase leading-none tracking-tight text-foreground">
          Students
        </h1>

        <div className="mt-6">
          <AdminGrantForm />
        </div>

        <div className="mt-6 overflow-x-auto border border-border">
          <table className="w-full text-left">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
                  Email
                </th>
                <th className="px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
                  Call status
                </th>
                <th className="px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
                  Progress
                </th>
                <th className="px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-body text-base text-foreground">{student.email}</td>
                  <td className="px-4 py-3">
                    <CallStatusSelect email={student.email} status={student.call_status} />
                  </td>
                  <td className="px-4 py-3 font-body text-base text-muted">
                    {student.completedModules}/{student.totalModules}
                  </td>
                  <td className="px-4 py-3 font-body text-base text-muted">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center font-body text-base text-muted" colSpan={4}>
                    No students yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {abandonedCheckouts.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading text-2xl font-bold uppercase leading-none tracking-tight text-foreground">
              Abandoned <span className="text-accent">Checkouts</span>
            </h2>
            <p className="mt-2 font-body text-base text-muted">
              Started checkout but never completed payment — worth a manual follow-up.
            </p>
            <div className="mt-4 overflow-x-auto border border-border">
              <table className="w-full text-left">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
                      Email
                    </th>
                    <th className="px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
                      Attempted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {abandonedCheckouts.map((attempt) => (
                    <tr key={attempt.email} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-body text-base text-foreground">
                        <a href={`mailto:${attempt.email}`} className="text-accent underline">
                          {attempt.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-body text-base text-muted">
                        {new Date(attempt.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
