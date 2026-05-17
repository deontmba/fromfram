import { SectionReveal } from "@/components/motion/section-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { LANDING_FAQ_ITEMS } from "@/lib/constants/landing";
import { sectionHeadingVariants } from "@/lib/animations";

export function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#f8f5ee] bg-grid-pattern py-18 sm:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal variants={sectionHeadingVariants}>
          <SectionHeading title="Pertanyaan yang Sering Diajukan" />
        </SectionReveal>
        <SectionReveal>
          <FaqAccordion items={LANDING_FAQ_ITEMS} />
        </SectionReveal>
      </div>
    </section>
  );
}