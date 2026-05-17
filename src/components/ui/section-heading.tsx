type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
};

export function SectionHeading({ title, subtitle, align = "center" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <h2 className="text-4xl font-black leading-[1.05] tracking-tight text-black sm:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base font-semibold leading-7 text-neutral-600 sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}