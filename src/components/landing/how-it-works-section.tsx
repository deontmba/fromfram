import { SectionReveal } from "@/components/motion/section-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { LANDING_STEPS } from "@/lib/constants/landing";
import { gridContainerVariants, gridItemVariants, sectionHeadingVariants } from "@/lib/animations";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#f0ece4] py-18 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal variants={sectionHeadingVariants}>
          <SectionHeading title="Cara Kerjanya" subtitle="Mudah dan praktis, hanya 4 langkah." />
        </SectionReveal>

        <SectionReveal variants={gridContainerVariants} className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {LANDING_STEPS.map((step) => (
            <SectionReveal key={step.number} variants={gridItemVariants}>
              <article
                className={`h-full rounded-[14px] border-2 border-[#1db788]/40 p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${step.tone}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                  {step.number}
                </span>
                <h3 className="mt-7 text-lg font-black tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-700">
                  {step.description}
                </p>
              </article>
            </SectionReveal>
          ))}
        </SectionReveal>
      </div>
    </section>
  );
}