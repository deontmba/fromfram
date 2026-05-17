type CheckIconProps = {
  active?: boolean;
};

export function CheckIcon({ active = false }: CheckIconProps) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#1db788]/40 text-[11px] font-black ${
        active ? "bg-[#13b987] text-white" : "bg-black text-white"
      }`}
    >
      <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" className="h-3 w-3">
        <path
          d="M2.2 6.1 4.8 8.7 9.8 3.3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}