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

// Footer — fade up sederhana
export const footerVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};
