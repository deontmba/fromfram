"use client";

import { SectionReveal } from "@/components/motion/section-reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { CheckIcon } from "@/components/ui/check-icon";
import { CtaButton } from "@/components/ui/cta-button";
import { LANDING_PRICING_PLANS } from "@/lib/constants/landing";
import { pricingContainerVariants, pricingItemVariants, sectionHeadingVariants } from "@/lib/animations";
import { motion } from "framer-motion";

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal variants={sectionHeadingVariants}>
          <SectionHeading
            title="Pilih Paket Sehatmu"
            subtitle="Investasi terbaik untuk kesehatan, fleksibel dengan kebutuhanmu."
          />
        </SectionReveal>

        <SectionReveal variants={pricingContainerVariants} className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {LANDING_PRICING_PLANS.map((plan) => (
            <SectionReveal key={plan.name} variants={pricingItemVariants}>
              <motion.article
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                className={`relative flex flex-col h-full rounded-[18px] border-2 border-[#1db788]/40 p-7 shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition-shadow hover:shadow-[0_20px_40px_rgba(15,23,42,0.15)] ${
                  plan.popular ? "bg-[#cdf5dd]" : "bg-white"
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#1db788]/40 bg-[#13b987] px-4 py-1 text-xs font-black text-white">
                    TERPOPULER
                  </span>
                ) : null}

                <h3 className="text-xl font-black">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <p className="text-4xl font-black leading-none tracking-tight">{plan.price}</p>
                  <span className="pb-1 text-sm font-black text-neutral-700">{plan.period}</span>
                </div>
                <p className="mt-4 min-h-12 text-sm font-bold leading-6 text-[#07845e]">
                  {plan.description}
                </p>

                <ul className="mt-8 space-y-4">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3 text-sm font-bold">
                      <CheckIcon active={plan.popular && benefit.includes("Discount")} />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <CtaButton
                    className={`inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 px-6 py-3 text-sm font-black shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:opacity-70 ${
                      plan.popular ? "bg-[#13b987] text-white" : "bg-white text-black"
                    }`}
                  >
                    Pilih Paket
                  </CtaButton>
                </div>
              </motion.article>
            </SectionReveal>
          ))}
        </SectionReveal>
      </div>
    </section>
  );
}