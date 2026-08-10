import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listModulesWithResources } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";
import { ModuleForm } from "@/components/ModuleForm";
import { ResourceForm } from "@/components/ResourceForm";
import { ReorderButtons } from "@/components/ReorderButtons";

export default async function AdminModulesPage() {
  const user = await requireAdmin();
  const modules = await listModulesWithResources();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 lg:max-w-4xl">
        <Link
          href="/admin"
          className="font-heading text-base font-bold uppercase tracking-wide text-muted-light hover:text-accent"
        >
          ← Back to students
        </Link>

        <h1 className="mt-3 font-heading text-3xl font-bold uppercase leading-none tracking-tight text-foreground">
          Modules
        </h1>

        <div className="mt-6 flex flex-col gap-8">
          {modules.map((courseModule, moduleIndex) => (
            <div key={courseModule.id} className="flex items-start gap-3">
              <ReorderButtons
                kind="module"
                id={courseModule.id}
                disableUp={moduleIndex === 0}
                disableDown={moduleIndex === modules.length - 1}
              />
              <div className="flex-1">
                <ModuleForm module={courseModule} />

                <div className="ml-4 mt-3 flex flex-col gap-2 border-l border-border pl-4">
                  <p className="font-heading text-base font-bold uppercase tracking-[0.3em] text-accent">
                    Resources
                  </p>
                  {courseModule.resources.map((resource, resourceIndex) => (
                    <div key={resource.id} className="flex items-start gap-3">
                      <ReorderButtons
                        kind="resource"
                        id={resource.id}
                        moduleId={courseModule.id}
                        disableUp={resourceIndex === 0}
                        disableDown={resourceIndex === courseModule.resources.length - 1}
                      />
                      <div className="flex-1">
                        <ResourceForm moduleId={courseModule.id} resource={resource} />
                      </div>
                    </div>
                  ))}
                  <ResourceForm moduleId={courseModule.id} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <p className="mb-2 font-heading text-base font-bold uppercase tracking-wide text-foreground">
            Add a module
          </p>
          <ModuleForm />
        </div>
      </main>
    </div>
  );
}
