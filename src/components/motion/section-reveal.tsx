"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

type SectionRevealProps = {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  amount?: number;
};

const defaultVariants: Variants = {
  hidden: { y: 32, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function SectionReveal({
  children,
  variants = defaultVariants,
  className,
  amount = 0.15,
}: SectionRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}