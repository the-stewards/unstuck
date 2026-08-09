import { requireStudent } from "@/lib/session";
import { getStudentById, getModules, getBonuses, getStudentBonusStatuses, getActiveTestimonials } from "@/lib/course";
import { getCourseProgress, getProgressMap } from "@/lib/progress";
import { AppHeader } from "@/components/AppHeader";
import { ModuleCard } from "@/components/ModuleCard";
import { ProgressBar } from "@/components/ProgressBar";
import { CtaBanner } from "@/components/CtaBanner";
import { BonusLock } from "@/components/BonusLock";
import { TestimonialBlock } from "@/components/TestimonialBlock";

export default async function DashboardPage() {
  const user = await requireStudent();

  const [student, modules, progressMap, courseProgress, bonuses, bonusStatuses, testimonials] =
    await Promise.all([
      getStudentById(user.id),
      getModules(),
      getProgressMap(user.id),
      getCourseProgress(user.id),
      getBonuses(),
      getStudentBonusStatuses(user.email!),
      getActiveTestimonials(),
    ]);

  const bonusStatusByBonusId = new Map(bonusStatuses.map((s) => [s.bonus_id, s.status]));
  const callStatus = student?.call_status ?? "not_booked";

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Your library</h1>

        <div className="mt-6">
          <ProgressBar percent={courseProgress.percent} label="Course progress" />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {modules.map((courseModule) => (
            <ModuleCard
              key={courseModule.id}
              id={courseModule.id}
              title={courseModule.title}
              description={courseModule.description}
              status={progressMap.get(courseModule.id) ?? "not_started"}
            />
          ))}
          {modules.length === 0 && (
            <p className="text-sm text-muted">No modules published yet.</p>
          )}
        </div>

        <div className="mt-10">
          <CtaBanner callStatus={callStatus} />
        </div>

        {bonuses.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-medium text-foreground">Your bonuses</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {bonuses.map((bonus) => (
                <BonusLock
                  key={bonus.id}
                  bonus={bonus}
                  status={bonusStatusByBonusId.get(bonus.id) ?? "locked_missed"}
                />
              ))}
            </div>
          </section>
        )}

        {testimonials.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-medium text-foreground">What other students say</h2>
            <div className="mt-4">
              <TestimonialBlock testimonials={testimonials} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
