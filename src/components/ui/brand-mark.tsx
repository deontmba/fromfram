import Image from "next/image";
import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={30} height={30} />
      <span className="text-xl font-extrabold text-[#13b987]">FromFram</span>
    </Link>
  );
}