import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listAllTestimonials } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";
import { TestimonialForm } from "@/components/TestimonialForm";
import { ReorderButtons } from "@/components/ReorderButtons";

export default async function AdminTestimonialsPage() {
  const user = await requireAdmin();
  const testimonials = await listAllTestimonials();

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
          Testimonials
        </h1>

        <div className="mt-6 flex flex-col gap-4">
          {testimonials.map((testimonial, index) => (
            <div key={testimonial.id} className="flex items-start gap-3">
              <ReorderButtons
                kind="testimonial"
                id={testimonial.id}
                disableUp={index === 0}
                disableDown={index === testimonials.length - 1}
              />
              <div className="flex-1">
                <TestimonialForm testimonial={testimonial} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <p className="mb-2 font-heading text-base font-bold uppercase tracking-wide text-foreground">
            Add a testimonial
          </p>
          <TestimonialForm />
        </div>
      </main>
    </div>
  );
}
