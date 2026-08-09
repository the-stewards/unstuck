import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStudent } from "@/lib/session";
import { getModule, getModules, getResourcesForModule } from "@/lib/course";
import { getModuleProgress } from "@/lib/progress";
import { AppHeader } from "@/components/AppHeader";
import { DubbEmbed } from "@/components/DubbEmbed";
import { ResourceCard } from "@/components/ResourceCard";
import { ProgressTracker } from "@/components/ProgressTracker";

export default async function ModulePage({ params }: PageProps<"/module/[id]">) {
  const { id } = await params;
  const user = await requireStudent();

  const [courseModule, resources, progress, allModules] = await Promise.all([
    getModule(id),
    getResourcesForModule(id),
    getModuleProgress(user.id, id),
    getModules(),
  ]);

  if (!courseModule) {
    notFound();
  }

  const currentIndex = allModules.findIndex((m) => m.id === id);
  const nextModule = currentIndex >= 0 ? allModules[currentIndex + 1] : undefined;
  const status = progress?.status ?? "not_started";

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← Back to library
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-foreground">{courseModule.title}</h1>
        {courseModule.description && (
          <p className="mt-2 text-sm text-muted">{courseModule.description}</p>
        )}
        {status === "complete" && (
          <p className="mt-2 text-sm text-accent">✓ Complete</p>
        )}

        <div className="mt-6">
          <DubbEmbed dubbUrl={courseModule.dubb_url} title={courseModule.title} />
        </div>

        {status !== "complete" && (
          <ProgressTracker
            moduleId={id}
            initialWatchPositionSeconds={progress?.watchPositionSeconds ?? 0}
          />
        )}

        {resources.length > 0 && (
          <div className="mt-8 flex flex-col gap-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-end">
          {nextModule ? (
            <Link
              href={`/module/${nextModule.id}`}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Next module →
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent"
            >
              Back to library
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
