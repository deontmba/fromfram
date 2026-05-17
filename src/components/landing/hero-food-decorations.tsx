"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function HeroFoodDecorations() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block"
      aria-hidden="true"
    >
      <motion.div
        initial={{ opacity: 0, x: -50, y: -20, rotate: -30 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate: -20 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
        className="absolute -left-72 top-10 xl:-left-64 xl:top-4"
      >
        <Image
          src="/images/brocolli.png"
          alt=""
          width={680}
          height={680}
          priority
          sizes="(min-width: 1280px) 620px, 420px"
          className="h-auto w-[420px] xl:w-[620px]"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -50, y: 50, rotate: 0 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate: 10 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        className="absolute -bottom-24 -left-32 xl:-bottom-20 xl:-left-16"
      >
        <Image
          src="/images/cheese.png"
          alt=""
          width={464}
          height={464}
          sizes="420px"
          className="h-auto w-[420px]"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50, y: -20, rotate: 0 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate: 9 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        className="absolute -right-40 top-16 xl:-right-24 xl:top-10"
      >
        <Image
          src="/images/milk.png"
          alt=""
          width={528}
          height={528}
          priority
          sizes="(min-width: 1280px) 390px, 300px"
          className="h-auto w-[300px] xl:w-[390px]"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50, y: 50, rotate: 0 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate: -8 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
        className="absolute -bottom-10 -right-72 xl:-bottom-4 xl:-right-56"
      >
        <Image
          src="/images/salmon.png"
          alt=""
          width={760}
          height={760}
          sizes="580px"
          className="h-auto w-[580px]"
        />
      </motion.div>
    </div>
  );
}