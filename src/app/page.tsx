"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Feature = {
  title: string;
  description: string;
  icon: "leaf" | "chef" | "clock" | "truck" | "heart" | "award";
  iconBg: string;
};

type Step = {
  number: string;
  title: string;
  description: string;
};

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initial: string;
};

type AuthMeResponse = {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    createdAt?: string;
  };
};

const features: Feature[] = [
  {
    title: "100% Fresh",
    description: "Bahan organik pilihan setiap hari",
    icon: "leaf",
    iconBg: "bg-[#1abb89]",
  },
  {
    title: "Chef Berpengalaman",
    description: "Diracik oleh chef profesional",
    icon: "chef",
    iconBg: "bg-[#179f97]",
  },
  {
    title: "Hemat Waktu",
    description: "Siap masak dalam 15 menit",
    icon: "clock",
    iconBg: "bg-[#ff6a6a]",
  },
  {
    title: "Gratis Ongkir",
    description: "Diantar langsung ke rumah Anda",
    icon: "truck",
    iconBg: "bg-[#1abb89]",
  },
  {
    title: "Nutrisi Seimbang",
    description: "Dirancang ahli gizi profesional",
    icon: "heart",
    iconBg: "bg-[#179f97]",
  },
  {
    title: "Kualitas Terjamin",
    description: "Sertifikasi BPOM & Halal",
    icon: "award",
    iconBg: "bg-[#ff6a6a]",
  },
];

const steps: Step[] = [
  {
    number: "1",
    title: "Pilih Plan",
    description: "Sesuaikan dengan kebutuhan Anda",
  },
  {
    number: "2",
    title: "Atur Menu",
    description: "Pilih menu favorit setiap minggu",
  },
  {
    number: "3",
    title: "Terima Paket",
    description: "Diantar fresh ke rumah Anda",
  },
  {
    number: "4",
    title: "Masak & Nikmati",
    description: "Siap dalam 15 menit!",
  },
];

const testimonials: Testimonial[] = [
  {
    name: "Sarah Wijaya",
    role: "Ibu Rumah Tangga",
    quote:
      '"FromFram benar-benar membantu saya! Sekarang saya punya lebih banyak waktu untuk keluarga tanpa khawatir soal menu makan sehat."',
    initial: "S",
  },
  {
    name: "Ahmad Rizki",
    role: "Fitness Enthusiast",
    quote:
      '"Menu fitness-nya perfect untuk program gym saya. High protein, rendah karbo, dan rasanya enak banget!"',
    initial: "A",
  },
  {
    name: "Linda Kusuma",
    role: "Professional",
    quote:
      '"Sebagai working mom, FromFram jadi penyelamat. Gak perlu mikir menu lagi, tinggal masak 15 menit langsung siap!"',
    initial: "L",
  },
];

const footerGroups = [
  {
    title: "Produk",
    links: [
      { label: "Menu" },
      { label: "Harga" },
      { label: "Kategori" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { label: "Tentang Kami" },
      { label: "Blog" },
      { label: "Karir" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { label: "FAQ" },
      { label: "Kontak" },
      { label: "Syarat & Ketentuan" },
    ],
  },
];

function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={34} height={34} />
      <span className="text-[1.55rem] font-bold tracking-[-0.03em] text-[#13a981]">
        FromFram
      </span>
    </Link>
  );
}

function FeatureIcon({ icon }: { icon: Feature["icon"] }) {
  const iconClassName = "h-5 w-5";

  if (icon === "leaf") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <path
          d="M20 4S13 3 8.5 7.5C5 11 5 16 5 16s5 0 8.5-3.5C18 8 20 4 20 4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 20c1.5-2.5 3.4-4.4 5.8-5.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "chef") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <path
          d="M7 10h10a3 3 0 0 1 3 3v4H4v-4a3 3 0 0 1 3-3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 10V9a4 4 0 1 1 8 0v1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "clock") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 8v5l3 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === "truck") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <path
          d="M3 7h11v8H3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 10h3l3 3v2h-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="18" r="1.5" fill="currentColor" />
        <circle cx="17.5" cy="18" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  if (icon === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
      <path
        d="M12 4 6.5 6v5c0 4 2.5 7.2 5.5 9 3-1.8 5.5-5 5.5-9V6L12 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 12 2 2 3-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRow() {
  return (
    <div className="flex items-center gap-1 text-[#f6b61f]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg key={index} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
          <path d="m10 1.7 2.1 4.7 5.1.5-3.8 3.4 1.1 5-4.5-2.6-4.5 2.6 1.1-5-3.8-3.4 5.1-.5L10 1.7Z" />
        </svg>
      ))}
    </div>
  );
}

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

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as AuthMeResponse | null;

        if (!isMounted) {
          return;
        }

        setIsAuthenticated(Boolean(response.ok && data?.user?.id));
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandMark />

          {isAuthenticated ? (
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
              <Link
                href="/subscription/select-plan"
                className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:text-[#13a981]"
              >
                Buat Subscription
              </Link>
              <Link
                href="/subscription"
                className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:text-[#13a981]"
              >
                Kelola Subscription
              </Link>
              <Link
                href="/profile"
                aria-label="Profile"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition hover:border-[#13a981] hover:text-[#13a981]"
              >
                <ProfileIcon />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:text-[#13a981]"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="inline-flex h-11 items-center rounded-2xl bg-[#1abb89] px-5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(18,168,123,0.24)] transition hover:bg-[#15a97b]"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </header>

      <section
        id="hero"
        className="overflow-hidden bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.95),transparent_30%),linear-gradient(135deg,#ecf7f1_0%,#f6f5f1_58%,#ffffff_100%)]"
      >
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <span className="inline-flex items-center rounded-full bg-[#dff4ea] px-4 py-2 text-sm font-semibold text-[#12a47c]">
            Fresh & Healthy Meal Subscription
          </span>

          <h1 className="mt-8 text-5xl font-bold tracking-[-0.05em] text-neutral-950 sm:text-6xl lg:text-[4.5rem]">
            <span className="block">Makanan Sehat,</span>
            <span className="mt-2 block bg-[linear-gradient(90deg,#1abb89_0%,#169e98_54%,#ff7c6b_100%)] bg-clip-text text-transparent">
              Diantar Setiap Hari
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-500 sm:text-xl">
            Meal kit segar dengan resep praktis yang dirancang ahli gizi. Hemat waktu,
            tetap sehat!
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/subscription/select-plan"
              className="inline-flex min-w-[240px] items-center justify-center rounded-[1.2rem] bg-[#1abb89] px-8 py-4 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(18,168,123,0.24)] transition hover:-translate-y-0.5 hover:bg-[#15a97b]"
            >
              Mulai Berlangganan
            </Link>
            <Link
              href="#features"
              className="inline-flex min-w-[230px] items-center justify-center rounded-[1.2rem] border border-neutral-200 bg-white px-8 py-4 text-lg font-semibold text-neutral-900 shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition hover:bg-neutral-50"
            >
              Pelajari Lebih Lanjut
            </Link>
          </div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-5xl font-bold tracking-[-0.05em] text-[#14ae86]">10k+</p>
              <p className="mt-2 text-base text-neutral-500">Member Aktif</p>
            </div>
            <div>
              <p className="text-5xl font-bold tracking-[-0.05em] text-[#14ae86]">50+</p>
              <p className="mt-2 text-base text-neutral-500">Menu Variatif</p>
            </div>
            <div>
              <p className="text-5xl font-bold tracking-[-0.05em] text-[#14ae86]">4.9</p>
              <p className="mt-2 text-base text-neutral-500">Rating Pengguna</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-[-0.04em] text-neutral-950 sm:text-[3.2rem]">
              Kenapa Pilih FromFram?
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-500 sm:text-xl">
              Kami berkomitmen memberikan pengalaman terbaik untuk gaya hidup sehat Anda
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[1.7rem] border border-neutral-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_10px_18px_rgba(15,23,42,0.12)] ${feature.iconBg}`}
                >
                  <FeatureIcon icon={feature.icon} />
                </div>
                <h3 className="mt-5 text-[1.45rem] font-bold tracking-[-0.03em] text-neutral-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-lg leading-8 text-neutral-500">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.95),transparent_28%),linear-gradient(135deg,#edf7f1_0%,#f7f8f6_62%,#ffffff_100%)] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-[-0.04em] text-neutral-950 sm:text-[3.1rem]">
              Cara Kerjanya
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-500 sm:text-xl">
              Mudah dan praktis, hanya 4 langkah
            </p>
          </div>

          <div className="relative mt-16 grid gap-10 md:grid-cols-2 xl:grid-cols-4">
            <div className="absolute left-[14%] right-[14%] top-7 hidden h-px bg-[#d8e8df] xl:block" />
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1abb89] text-3xl font-bold text-white shadow-[0_12px_22px_rgba(18,168,123,0.24)]">
                  {step.number}
                </div>
                <h3 className="mt-6 text-[1.45rem] font-bold tracking-[-0.03em] text-neutral-950">
                  {step.title}
                </h3>
                <p className="mx-auto mt-3 max-w-[16rem] text-lg leading-8 text-neutral-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="scroll-mt-24 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-[-0.04em] text-neutral-950 sm:text-[3.05rem]">
              Kata Mereka Tentang FromFram
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-500 sm:text-xl">
              Ribuan pelanggan puas dengan layanan kami
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className="rounded-[1.7rem] border border-neutral-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              >
                <StarRow />
                <p className="mt-6 text-[1.15rem] leading-9 text-neutral-500">
                  {testimonial.quote}
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14ae86] text-lg font-bold text-white">
                    {testimonial.initial}
                  </div>
                  <div>
                    <p className="text-[1.2rem] font-bold tracking-[-0.03em] text-neutral-950">
                      {testimonial.name}
                    </p>
                    <p className="text-base text-neutral-500">{testimonial.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#1abb89_0%,#17a98d_100%)] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold tracking-[-0.04em] sm:text-[3.2rem]">
            Siap Untuk Hidup Lebih Sehat?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
            Bergabung dengan ribuan member yang sudah merasakan manfaatnya
          </p>
          <div className="mt-10">
            <Link
              href="/subscription/select-plan"
              className="inline-flex items-center justify-center rounded-[1.2rem] bg-white px-8 py-4 text-lg font-semibold text-[#14ae86] shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#f7fffb]"
            >
              Daftar Sekarang - Gratis 7 Hari
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr_0.85fr_0.85fr] lg:px-8">
          <div>
            <BrandMark />
            <p className="mt-5 text-lg leading-8 text-neutral-500">
              Fresh meals, delivered daily
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[1.25rem] font-bold tracking-[-0.03em] text-neutral-950">
                {group.title}
              </h3>
              <div className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <span
                    key={link.label}
                    className="block text-lg text-neutral-500 transition hover:text-[#13a981]"
                  >
                    {link.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-100 px-4 py-8 text-center text-base text-neutral-500 sm:px-6 lg:px-8">
          (c) 2024 FromFram. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
