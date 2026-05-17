"use client";

import { useState } from "react";
import type { FaqItem } from "@/types/landing";

type FaqAccordionProps = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <div className="mt-10 space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={item.question}
            className="rounded-[14px] border-2 border-[#1db788]/40 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-black sm:text-base"
              aria-expanded={isOpen}
            >
              {item.question}
              <span className="text-xl leading-none" aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen ? (
              <div className="border-t-2 border-[#1db788]/30 px-5 py-4 text-sm font-semibold leading-6 text-neutral-600">
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}