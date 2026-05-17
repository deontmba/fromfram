import { SectionReveal } from "@/components/motion/section-reveal";
import { BrandMark } from "@/components/ui/brand-mark";
import { LANDING_FOOTER_GROUPS } from "@/lib/constants/landing";
import { footerVariants } from "@/lib/animations";

export function Footer() {
  return (
    <SectionReveal variants={footerVariants}>
      <footer className="bg-[#fffdf7]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-sm text-sm font-semibold leading-6 text-neutral-600">
              Fresh meals, delivered daily. Makan sehat jadi lebih mudah tanpa repot.
            </p>
          </div>

          {LANDING_FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-black">{group.title}</h3>
              <div className="mt-5 space-y-3">
                {group.links.map((label) => (
                  <a
                    key={label}
                    href="#"
                    className="block text-sm font-semibold text-neutral-600 hover:text-[#13b987]"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-7xl border-t-2 border-[#1db788]/30 px-4 py-7 text-sm font-semibold text-neutral-600 sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} FromFram. All rights reserved.
        </div>
      </footer>
    </SectionReveal>
  );
}