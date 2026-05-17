import type { Variants } from "framer-motion";

// Navbar — slide down dari atas
export const navbarVariants: Variants = {
  hidden: { y: -64, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Hero — fade + scale up, staggered children
export const heroContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

export const heroItemVariants: Variants = {
  hidden: { y: 32, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export const heroCardVariants: Variants = {
  hidden: { y: 48, opacity: 0, scale: 0.97 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.6 },
  },
};

// Section heading — fade up
export const sectionHeadingVariants: Variants = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

// Grid cards — staggered fade up
export const gridContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export const gridItemVariants: Variants = {
  hidden: { y: 28, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Pricing cards — staggered dengan scale
export const pricingContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

export const pricingItemVariants: Variants = {
  hidden: { y: 32, opacity: 0, scale: 0.96 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

// CTA section — fade + scale dari tengah
export const ctaVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

// Footer — fade up sederhana
export const footerVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};