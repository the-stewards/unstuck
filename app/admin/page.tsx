import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listStudentsWithProgress } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";
import { AdminGrantForm } from "@/components/AdminGrantForm";
import { CallStatusSelect } from "@/components/CallStatusSelect";

export default async function AdminPage() {
  const user = await requireAdmin();
  const students = await listStudentsWithProgress();

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

        <h1 className="mt-6 font-heading text-3xl font-bold uppercase leading-none tracking-tight text-foreground">
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
      </main>
    </div>
  );
}
