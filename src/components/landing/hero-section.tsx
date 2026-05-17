"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CtaButton } from "@/components/ui/cta-button";
import { HeroFoodDecorations } from "@/components/landing/hero-food-decorations";
import { LANDING_STATS } from "@/lib/constants/landing";
import {
  heroContainerVariants,
  heroItemVariants,
  heroCardVariants,
} from "@/lib/animations";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b-2 border-[#1db788]/30 bg-[#fffdf7]">
      <HeroFoodDecorations />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={heroContainerVariants}
        className="relative z-10 mx-auto max-w-5xl px-4 pt-8 pb-20 text-center sm:px-6 sm:pt-12 sm:pb-24 lg:px-8 lg:pt-16 lg:pb-28"
      >
        <motion.span
          variants={heroItemVariants}
          className="inline-flex items-center rounded-full border-2 border-[#1db788]/40 bg-white px-4 py-2 text-xs font-black text-black shadow-sm sm:text-sm"
        >
          Fresh & Healthy Meal Subscription
        </motion.span>

        <motion.h1
          variants={heroItemVariants}
          className="mx-auto mt-8 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-[#13b987] sm:text-7xl lg:text-8xl"
        >
          Makanan Sehat, Diantar Setiap Hari.
        </motion.h1>

        <motion.p
          variants={heroItemVariants}
          className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-neutral-700 sm:text-lg"
        >
          Meal kit segar dengan resep praktis yang dirancang ahli gizi. Hemat waktu, tetap sehat!
        </motion.p>

        <motion.div
          variants={heroItemVariants}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <CtaButton className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-[#13b987] px-7 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto">
            Mulai Berlangganan
          </CtaButton>
          <Link
            href="#features"
            className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-white px-7 py-3 text-sm font-black text-black shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] sm:w-auto"
          >
            Pelajari Lebih Lanjut
          </Link>
        </motion.div>



        <motion.div
          variants={heroItemVariants}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {LANDING_STATS.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-[18px] border-2 border-[#1db788]/40 bg-white px-4 py-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            >
              <p className="text-4xl font-black tracking-tight text-[#13b987]">{value}</p>
              <p className="mt-1 text-sm font-bold text-neutral-600">{label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}