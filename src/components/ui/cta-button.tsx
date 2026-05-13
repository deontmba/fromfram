"use client";

import { useCtaNavigation } from "@/hooks/use-cta-navigation";
import { useRouter } from "next/navigation";
import { LANDING_ROUTES } from "@/lib/constants/landing";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CtaButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function CtaButton({ children, className }: CtaButtonProps) {
  const { navigate, isLoading, showAlert, setShowAlert } = useCtaNavigation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={navigate}
        disabled={isLoading}
        className={`cursor-pointer disabled:cursor-not-allowed ${className || ""}`}
      >
        {children}
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {showAlert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f8ed] text-[#13b987]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <h3 className="mb-2 text-xl font-bold text-black">Perlu Login</h3>
                <p className="mb-6 text-sm text-neutral-600">
                  Silakan masuk (login) terlebih dahulu untuk mulai berlangganan atau memilih paket.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAlert(false)}
                    className="w-full cursor-pointer rounded-xl border-2 border-neutral-200 py-2.5 font-bold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      setShowAlert(false);
                      router.push(LANDING_ROUTES.login);
                    }}
                    className="w-full cursor-pointer rounded-xl bg-[#13b987] py-2.5 font-bold text-white transition hover:bg-[#0f996f]"
                  >
                    Login Sekarang
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}