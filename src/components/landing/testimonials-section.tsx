import { SectionReveal } from "@/components/motion/section-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { StarRow } from "@/components/ui/star-row";
import { LANDING_TESTIMONIALS } from "@/lib/constants/landing";
import { gridContainerVariants, gridItemVariants, sectionHeadingVariants } from "@/lib/animations";

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] bg-grid-pattern py-18 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal variants={sectionHeadingVariants}>
          <SectionHeading
            title="Kata Mereka Tentang FromFram"
            subtitle="Ribuan pelanggan puas dengan layanan kami."
          />
        </SectionReveal>

        <SectionReveal variants={gridContainerVariants} className="mt-12 grid gap-6 lg:grid-cols-3">
          {LANDING_TESTIMONIALS.map((testimonial) => (
            <SectionReveal key={testimonial.name} variants={gridItemVariants}>
              <article
                className={`h-full rounded-[14px] border-2 border-[#1db788]/40 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.10)] ${testimonial.tilt}`}
              >
                <StarRow />
                <p className="mt-5 text-base font-bold leading-7 text-neutral-800">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-[#13b987] text-sm font-black text-white">
                    {testimonial.initial}
                  </span>
                  <div>
                    <p className="font-black tracking-tight">{testimonial.name}</p>
                    <p className="text-xs font-semibold text-neutral-500">{testimonial.role}</p>
                  </div>
                </div>
              </article>
            </SectionReveal>
          ))}
        </SectionReveal>
      </div>
    </section>
  );
}