import Image from "next/image";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionReveal } from "@/components/motion/section-reveal";
import { TEAM_MEMBERS } from "@/lib/constants/landing";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f8f5ee] text-black">
      <Navbar />
      <div className="flex-grow py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionReveal>
            <SectionHeading
              title="Meet the Team"
              subtitle="Mengenal tim di balik FromFram"
            />
          </SectionReveal>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM_MEMBERS.map((member, index) => (
              <SectionReveal key={index}>
                <div className="flex flex-col items-center rounded-3xl border-2 border-[#1db788]/30 bg-white p-8 shadow-sm transition hover:shadow-md">
                  <div className="relative mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-[#13b987] shadow-inner bg-neutral-100">
                    <Image src={member.image} alt={member.name} fill className="object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-black text-center">{member.name}</h3>
                  <p className="mt-2 text-center text-sm font-medium text-neutral-600">
                    {member.role}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
