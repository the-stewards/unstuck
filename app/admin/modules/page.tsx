import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listModulesWithResources } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";
import { ModuleForm } from "@/components/ModuleForm";
import { ResourceForm } from "@/components/ResourceForm";

export default async function AdminModulesPage() {
  const user = await requireAdmin();
  const modules = await listModulesWithResources();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Back to students
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-foreground">Modules</h1>

        <div className="mt-6 flex flex-col gap-8">
          {modules.map((courseModule) => (
            <div key={courseModule.id}>
              <ModuleForm module={courseModule} />

              <div className="ml-4 mt-3 flex flex-col gap-2 border-l border-border pl-4">
                <p className="text-xs uppercase tracking-wide text-muted">Resources</p>
                {courseModule.resources.map((resource) => (
                  <ResourceForm
                    key={resource.id}
                    moduleId={courseModule.id}
                    resource={resource}
                  />
                ))}
                <ResourceForm moduleId={courseModule.id} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <p className="mb-2 text-sm font-medium text-foreground">Add a module</p>
          <ModuleForm />
        </div>
      </main>
    </div>
  );
}
