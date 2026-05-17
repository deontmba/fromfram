export function StarRow() {
  return (
    <div className="flex items-center gap-1 text-[#ffbf1f]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path d="m10 1.7 2.1 4.7 5.1.5-3.8 3.4 1.1 5-4.5-2.6-4.5 2.6 1.1-5-3.8-3.4 5.1-.5L10 1.7Z" />
        </svg>
      ))}
    </div>
  );
}