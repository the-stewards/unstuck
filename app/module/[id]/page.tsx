import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStudent } from "@/lib/session";
import { getModule, getModules, getResourcesForModule } from "@/lib/course";
import { getModuleProgress } from "@/lib/progress";
import { AppHeader } from "@/components/AppHeader";
import { DubbEmbed } from "@/components/DubbEmbed";
import { ResourceCard } from "@/components/ResourceCard";
import { ProgressTracker } from "@/components/ProgressTracker";
import { MarkCompleteButton } from "@/components/MarkCompleteButton";

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

  // Direct-link the URL before it's published (e.g. an old bookmark, or the
  // admin hasn't flipped it live yet) and this bounces back — the same
  // safety net the dashboard's own "coming soon" cards give by not linking.
  if (courseModule.status === "coming_soon") {
    redirect("/dashboard");
  }

  const publishedModules = allModules.filter((m) => m.status === "published");
  const currentIndex = publishedModules.findIndex((m) => m.id === id);
  const prevModule = currentIndex > 0 ? publishedModules[currentIndex - 1] : undefined;
  const nextModule = currentIndex >= 0 ? publishedModules[currentIndex + 1] : undefined;
  const status = progress?.status ?? "not_started";

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 lg:max-w-4xl">
        <Link
          href="/dashboard"
          className="font-heading text-base font-bold uppercase tracking-wide text-muted-light hover:text-accent"
        >
          ← Back to Starter Kit
        </Link>

        {currentIndex >= 0 && (
          <p className="mt-4 font-heading text-base font-bold uppercase tracking-[0.3em] text-muted-light">
            Module {currentIndex + 1} of {allModules.length}
          </p>
        )}

        <h1 className="mt-2 font-heading text-3xl font-bold uppercase leading-none tracking-tight text-foreground">
          {courseModule.title}
        </h1>
        {courseModule.description && (
          <p className="mt-2 font-body text-lg font-light text-muted">
            {courseModule.description}
          </p>
        )}
        {status === "complete" && (
          <p className="mt-2 font-heading text-base font-bold uppercase tracking-wide text-accent">
            ✓ Complete
          </p>
        )}

        <div className="mt-6">
          <DubbEmbed embedHtml={courseModule.dubb_url} title={courseModule.title} />
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

        <div className="mt-10 flex items-center justify-between">
          {prevModule ? (
            <Link
              href={`/module/${prevModule.id}`}
              className="border border-foreground px-6 py-3 font-heading text-base font-bold uppercase tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              ← Previous module
            </Link>
          ) : (
            <span />
          )}
          {status === "complete" ? (
            nextModule ? (
              <Link
                href={`/module/${nextModule.id}`}
                className="bg-accent px-6 py-3 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90"
              >
                Next module →
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="border border-foreground px-6 py-3 font-heading text-base font-bold uppercase tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Back to Starter Kit
              </Link>
            )
          ) : (
            <MarkCompleteButton
              moduleId={id}
              nextHref={nextModule ? `/module/${nextModule.id}` : "/dashboard"}
              label={nextModule ? "Mark Complete / Next Video →" : "Mark Complete"}
            />
          )}
        </div>
      </main>
    </div>
  );
}
