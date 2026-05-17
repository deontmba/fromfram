import Image from "next/image";
import { SectionReveal } from "@/components/motion/section-reveal";
import { SectionHeading } from "@/components/ui/section-heading";

export function CollageSection() {
  return (
    <section className="border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <SectionHeading
            title="Galeri Menu Kami"
            subtitle="Beragam hidangan lezat dan sehat, disiapkan khusus untuk Anda."
          />
        </SectionReveal>
        <SectionReveal className="mt-12">
          <div className="grid h-[400px] grid-cols-2 gap-3 sm:h-[500px] sm:gap-4 md:h-[600px] md:grid-cols-4 md:grid-rows-2 md:gap-6">
            <div className="relative col-span-2 md:col-span-2 md:row-span-2 overflow-hidden rounded-[20px] md:rounded-[32px] border-2 border-[#1db788]/30 bg-neutral-200">
              <Image src="/images/makanan4.png" alt="Salmon" fill className="object-cover" />
            </div>
            <div className="relative col-span-1 flex items-center justify-center overflow-hidden rounded-[20px] md:rounded-[32px] border-2 border-[#1db788]/30 bg-[#13b987] p-4 sm:p-6 text-center md:col-span-1 md:row-span-1">
              <h3 className="text-base sm:text-lg font-bold leading-tight text-white md:text-2xl">
                100% Organik & Segar
              </h3>
            </div>
            <div className="relative col-span-1 overflow-hidden rounded-[20px] md:rounded-[32px] border-2 border-[#1db788]/30 bg-neutral-200 md:col-span-1 md:row-span-1">
              <Image src="/images/makanan5.png" alt="Milk" fill className="object-cover" />
            </div>
            <div className="relative col-span-2 hidden overflow-hidden rounded-[20px] md:rounded-[32px] border-2 border-[#1db788]/30 bg-neutral-200 md:col-span-2 md:row-span-1 md:block">
              <Image src="/images/makanan3.png" alt="Brocolli" fill className="object-cover" />
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
