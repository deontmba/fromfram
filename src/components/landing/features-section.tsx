import { SectionReveal } from "@/components/motion/section-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { LANDING_FEATURES } from "@/lib/constants/landing";
import { gridContainerVariants, gridItemVariants, sectionHeadingVariants } from "@/lib/animations";
import type { FeatureIcon } from "@/types/landing";

function FeatureIcon({ icon }: { icon: FeatureIcon }) {
  const cls = "h-5 w-5";

  if (icon === "leaf") return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cls}>
      <path d="M20 4S13 3 8.5 7.5C5 11 5 16 5 16s5 0 8.5-3.5C18 8 20 4 20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20c1.5-2.5 3.4-4.4 5.8-5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (icon === "chef") return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cls}>
      <path d="M7 10h10a3 3 0 0 1 3 3v4H4v-4a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10V9a4 4 0 1 1 8 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  if (icon === "clock") return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cls}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (icon === "truck") return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cls}>
      <path d="M3 7h11v8H3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10h3l3 3v2h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="18" r="1.5" fill="currentColor" />
      <circle cx="17.5" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
  if (icon === "heart") return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cls}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cls}>
      <path d="M12 4 6.5 6v5c0 4 2.5 7.2 5.5 9 3-1.8 5.5-5 5.5-9V6L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9.5 12 2 2 3-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] bg-grid-pattern py-18 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal variants={sectionHeadingVariants}>
          <SectionHeading
            align="left"
            title="Kenapa Pilih FromFram?"
            subtitle="Kami berkomitmen memberikan pengalaman terbaik untuk gaya hidup sehat Anda."
          />
        </SectionReveal>

        <SectionReveal variants={gridContainerVariants} className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((feature) => (
            <SectionReveal key={feature.title} variants={gridItemVariants}>
              <article className="h-full rounded-[14px] border-2 border-[#1db788]/40 bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] border-2 border-[#1db788]/40 bg-[#13b987] text-white">
                  <FeatureIcon icon={feature.icon} />
                </div>
                <h3 className="mt-5 text-xl font-black tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600">
                  {feature.description}
                </p>
              </article>
            </SectionReveal>
          ))}
        </SectionReveal>
      </div>
    </section>
  );
}