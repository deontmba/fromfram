import { SectionReveal } from "@/components/motion/section-reveal";
import { CtaButton } from "@/components/ui/cta-button";
import { ctaVariants } from "@/lib/animations";

export function CtaSection() {
  return (
    <section className="border-b-2 border-[#1db788]/30 bg-[#064E3B] py-20 text-white sm:py-24">
      <SectionReveal variants={ctaVariants}>
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Siap Untuk Hidup Lebih Sehat?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/75 sm:text-lg">
            Bergabung dengan ribuan member yang sudah merasakan manfaatnya.
          </p>
          <CtaButton className="mt-9 inline-flex rounded-full border-2 border-[#1db788] bg-[#13b987] px-7 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(255,255,255,0.18)] disabled:cursor-not-allowed disabled:opacity-70">
            Daftar Sekarang
          </CtaButton>
        </div>
      </SectionReveal>
    </section>
  );
}