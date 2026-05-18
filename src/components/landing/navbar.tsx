"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { useAuthState } from "@/hooks/use-auth-state";
import { navbarVariants } from "@/lib/animations";

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Tentang Kami", href: "/about" },
  { label: "Kontak", href: "/contact" },
];

export function Navbar() {
  const { isAuthenticated, isLoading, user } = useAuthState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="h-[66px]" aria-hidden="true" />
      <motion.header
        initial="hidden"
        animate="visible"
        variants={navbarVariants}
        className="fixed left-0 right-0 top-0 z-50 w-full border-b-2 border-[#1db788]/30 bg-[#fffdf7]/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <BrandMark />

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative px-1 py-2 text-sm font-extrabold text-black transition-colors hover:text-[#13b987]"
              >
                {link.label}
                <motion.span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#13b987] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden h-10 min-w-[120px] items-center justify-end md:flex">
            {!isLoading && (
              isAuthenticated ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <Link href="/dashboard" className="px-3 py-2 text-sm font-extrabold text-black hover:text-[#13b987]">
                    Dashboard
                  </Link>
                  <Link href="/profile" aria-label="Profil saya" className="inline-flex h-10 w-10 overflow-hidden items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <ProfileIcon />
                    )}
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-6 sm:gap-8">
                  <Link href="/login" className="group relative px-1 py-2 text-sm font-extrabold text-black transition-colors hover:text-[#13b987]">
                    Masuk
                    <motion.span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#13b987] transition-all duration-300 group-hover:w-full" />
                  </Link>
                  <Link href="/register" className="group relative px-1 py-2 text-sm font-extrabold text-black transition-colors hover:text-[#13b987]">
                    Daftar
                    <motion.span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#13b987] transition-all duration-300 group-hover:w-full" />
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#1db788]"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">{isMobileMenuOpen ? "Tutup menu" : "Buka menu"}</span>
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-[#fffdf7] border-t-2 border-[#1db788]/30 md:hidden"
            >
              <div className="space-y-1 px-4 pb-3 pt-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-md px-3 py-3 text-base font-bold text-black hover:bg-[#e5f8ed] hover:text-[#13b987]"
                  >
                    {link.label}
                  </Link>
                ))}
                
                <div className="mt-4 border-t-2 border-neutral-100 pt-4 pb-2">
                  {!isLoading && (
                    isAuthenticated ? (
                      <div className="space-y-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block rounded-md px-3 py-3 text-base font-bold text-black hover:bg-[#e5f8ed] hover:text-[#13b987]"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block rounded-md px-3 py-3 text-base font-bold text-black hover:bg-[#e5f8ed] hover:text-[#13b987]"
                        >
                          Profil Saya
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Link
                          href="/login"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block rounded-md px-3 py-3 text-base font-bold text-black hover:bg-[#e5f8ed] hover:text-[#13b987]"
                        >
                          Masuk
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block rounded-md px-3 py-3 text-base font-bold text-black hover:bg-[#e5f8ed] hover:text-[#13b987]"
                        >
                          Daftar
                        </Link>
                      </div>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}