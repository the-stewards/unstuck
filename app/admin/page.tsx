import { requireAdmin } from "@/lib/session";
import { listStudentsWithProgress } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";

export default async function AdminPage() {
  const user = await requireAdmin();
  const students = await listStudentsWithProgress();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Students</h1>

        {/* Manual grant-access form + call-status toggle wired in Phase 4 */}

        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Call status</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{student.email}</td>
                  <td className="px-4 py-3 text-muted">{student.call_status}</td>
                  <td className="px-4 py-3 text-muted">
                    {student.completedModules}/{student.totalModules}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-muted" colSpan={4}>
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
