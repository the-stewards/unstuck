import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listAllTestimonials } from "@/lib/admin-data";
import { AppHeader } from "@/components/AppHeader";
import { TestimonialForm } from "@/components/TestimonialForm";

export default async function AdminTestimonialsPage() {
  const user = await requireAdmin();
  const testimonials = await listAllTestimonials();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Back to students
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-foreground">Testimonials</h1>

        <div className="mt-6 flex flex-col gap-4">
          {testimonials.map((testimonial) => (
            <TestimonialForm key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        <div className="mt-10">
          <p className="mb-2 text-sm font-medium text-foreground">Add a testimonial</p>
          <TestimonialForm />
        </div>
      </main>
    </div>
  );
}
