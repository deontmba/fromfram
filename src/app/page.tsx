"use client";

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { CollageSection } from "@/components/landing/collage-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Feature = {
  title: string;
  description: string;
  icon: "leaf" | "chef" | "clock" | "truck" | "heart" | "award";
};

type Step = {
  number: string;
  title: string;
  description: string;
  tone: string;
};

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initial: string;
  tilt: string;
};

type PricingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  benefits: string[];
  popular?: boolean;
};

type FaqItem = {
  question: string;
  answer: string;
};

type AuthMeResponse = {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    createdAt?: string;
  };
};

const loginHref = "/login";
const selectPlanHref = "/subscription/select-plan";
const dashboardHref = "/dashboard";

const features: Feature[] = [
  {
    title: "100% Fresh",
    description: "Bahan organik pilihan setiap hari",
    icon: "leaf",
  },
  {
    title: "Chef Berpengalaman",
    description: "Diracik oleh chef profesional",
    icon: "chef",
  },
  {
    title: "Hemat Waktu",
    description: "Siap masak dalam 15 menit",
    icon: "clock",
  },
  {
    title: "Gratis Ongkir",
    description: "Diantar langsung ke rumah Anda",
    icon: "truck",
  },
  {
    title: "Nutrisi Seimbang",
    description: "Dirancang ahli gizi profesional",
    icon: "heart",
  },
  {
    title: "Kualitas Terjamin",
    description: "Sertifikasi BPOM & Halal",
    icon: "award",
  },
];

const steps: Step[] = [
  {
    number: "1",
    title: "Pilih Plan",
    description: "Sesuaikan dengan kebutuhan Anda",
    tone: "bg-[#d2f5df]",
  },
  {
    number: "2",
    title: "Atur Menu",
    description: "Pilih menu favorit setiap minggu",
    tone: "bg-[#ffe0dc]",
  },
  {
    number: "3",
    title: "Terima Paket",
    description: "Diantar fresh ke rumah Anda",
    tone: "bg-[#dceefe]",
  },
  {
    number: "4",
    title: "Masak & Nikmati",
    description: "Siap dalam 15 menit!",
    tone: "bg-[#fff1ce]",
  },
];

const testimonials: Testimonial[] = [
  {
    name: "Sarah Wijaya",
    role: "Ibu Rumah Tangga",
    quote:
      "FromFram benar-benar membantu saya! Sekarang saya punya lebih banyak waktu untuk keluarga tanpa khawatir soal menu makan sehat.",
    initial: "S",
    tilt: "lg:-rotate-1",
  },
  {
    name: "Ahmad Rizki",
    role: "Fitness Enthusiast",
    quote:
      "Menu fitness-nya perfect untuk program gym saya. High protein, rendah karbo, dan rasanya enak banget!",
    initial: "A",
    tilt: "lg:rotate-1",
  },
  {
    name: "Linda Kusuma",
    role: "Profesional",
    quote:
      "Sebagai working mom, FromFram jadi penyelamat. Gak perlu mikir menu lagi, tinggal masak 15 menit langsung siap.",
    initial: "L",
    tilt: "lg:-rotate-1",
  },
];

const pricingPlans: PricingPlan[] = [
  {
    name: "Mingguan",
    price: "Rp 350.000",
    period: "/mgg",
    description: "Fleksibel, bisa cancel kapan saja",
    benefits: ["7 hari meal kit", "Gratis ongkir", "Bisa skip minggu depan"],
  },
  {
    name: "Bulanan",
    price: "Rp 1.200.000",
    period: "/bln",
    description: "Hemat 14% dari plan mingguan",
    benefits: ["28 hari meal kit", "Gratis ongkir", "Priority support", "Discount 14%"],
    popular: true,
  },
  {
    name: "Tahunan",
    price: "Rp 12.000.000",
    period: "/thn",
    description: "Hemat 29% dari plan mingguan",
    benefits: ["365 hari meal kit", "Gratis ongkir", "Priority support", "1 minggu gratis"],
  },
];

const faqItems: FaqItem[] = [
  {
    question: "Apakah bahan makanan sudah diporsi?",
    answer:
      "Ya, semua bahan sudah ditimbang dan diporsi sesuai resep, sehingga Anda tinggal memasaknya.",
  },
  {
    question: "Apakah bisa memilih menu mingguan?",
    answer:
      "Bisa. Anda dapat memilih menu favorit setiap minggu sebelum paket diproses dan dikirim.",
  },
  {
    question: "Apakah tersedia paket diet atau fitness?",
    answer:
      "Tersedia paket diet seimbang dan fitness meal dengan komposisi nutrisi yang lebih terukur.",
  },
  {
    question: "Berapa lama proses memasaknya?",
    answer:
      "Sebagian besar menu dirancang siap dalam sekitar 15 menit dengan langkah masak yang praktis.",
  },
];

const footerGroups = [
  {
    title: "Produk",
    links: ["Menu", "Harga", "Kategori"],
  },
  {
    title: "Perusahaan",
    links: ["Tentang Kami", "Blog", "Karir"],
  },
  {
    title: "Bantuan",
    links: ["FAQ", "Kontak", "Syarat & Ketentuan"],
  },
];

function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={30} height={30} />
      <span className="text-xl font-extrabold text-[#13b987]">FromFram</span>
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

function StarRow() {
  return (
    <div className="flex items-center gap-1 text-[#ffbf1f]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg key={index} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
          <path d="m10 1.7 2.1 4.7 5.1.5-3.8 3.4 1.1 5-4.5-2.6-4.5 2.6 1.1-5-3.8-3.4 5.1-.5L10 1.7Z" />
        </svg>
      ))}
    </div>
  );
}

function HeroFoodDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block" aria-hidden="true">
      <Image
        src="/images/brocolli.png"
        alt=""
        width={680}
        height={680}
        priority
        sizes="(min-width: 1280px) 620px, 420px"
        className="absolute -left-60 top-20 h-auto w-[420px] -rotate-[20deg] xl:-left-52 xl:w-[620px]"
      />
      <Image
        src="/images/cheese.png"
        alt=""
        width={464}
        height={464}
        sizes="420px"
        className="absolute -bottom-24 -left-16 h-auto w-[420px] rotate-[10deg]"
      />
      <Image
        src="/images/milk.png"
        alt=""
        width={528}
        height={528}
        priority
        sizes="(min-width: 1280px) 390px, 300px"
        className="absolute -right-16 top-24 h-auto w-[300px] rotate-[9deg] xl:right-4 xl:w-[390px]"
      />
      <Image
        src="/images/salmon.png"
        alt=""
        width={760}
        height={760}
        sizes="580px"
        className="absolute -right-56 bottom-20 h-auto w-[580px] -rotate-[8deg] xl:-right-40"
      />
    </div>
  );
}

function HeroPreviewCard() {
  return (
    <div className="mx-auto mt-12 w-full max-w-3xl rounded-[24px] border-2 border-[#1db788]/40 bg-white p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.10)] sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[18px] bg-[#f2faf5] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold text-[#13b987]">Fresh box</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-black">Menu siap masak</h2>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] border-2 border-[#1db788]/40 bg-[#13b987] text-white shadow-md">
              <Image src="/icons/basic.svg" alt="" width={28} height={28} aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <span className="rounded-[12px] bg-[#d3f5df] px-3 py-3 text-center text-sm font-extrabold text-[#087b58]">
              Sayur
            </span>
            <span className="rounded-[12px] bg-[#dceefe] px-3 py-3 text-center text-sm font-extrabold text-[#126087]">
              Protein
            </span>
            <span className="rounded-[12px] bg-[#ffe0dc] px-3 py-3 text-center text-sm font-extrabold text-[#b23a30]">
              Saus
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center gap-3 rounded-[16px] border-2 border-[#1db788]/40 bg-white px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f8ed]">
              <Image src="/icons/diet.svg" alt="" width={22} height={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-black">Diet seimbang</p>
              <p className="text-xs font-semibold text-neutral-500">Kalori terukur</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[16px] border-2 border-[#1db788]/40 bg-white px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e5f8ed]">
              <Image src="/icons/fitness.svg" alt="" width={22} height={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-black">Fitness meal</p>
              <p className="text-xs font-semibold text-neutral-500">Protein harian</p>
            </div>
          </div>
          <div className="rounded-[16px] border-2 border-[#1db788]/40 bg-[#13b987] px-4 py-4 text-white">
            <p className="text-sm font-extrabold text-white/80">Dikirim fresh</p>
            <p className="mt-1 text-2xl font-black leading-none tracking-tight">15 menit siap</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <h2 className="text-4xl font-black leading-[1.05] tracking-tight text-black sm:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base font-semibold leading-7 text-neutral-600 sm:text-lg">{subtitle}</p>
      ) : null}
    </div>
  );
}

function CheckIcon({ active = false }: { active?: boolean }) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExistingSubscription(payload: unknown) {
  if (payload === null || payload === undefined) {
    return false;
  }

  const subscription = isRecord(payload) && "data" in payload
    ? payload.data
    : isRecord(payload) && "subscription" in payload
      ? payload.subscription
      : payload;

  if (!isRecord(subscription)) {
    return false;
  }

  if (typeof subscription.id === "string" && subscription.id.trim().length > 0) {
    return true;
  }

  return ["planId", "plan", "status", "startDate", "endDate", "currentPeriodEnd"].some(
    (key) => subscription[key] !== null && subscription[key] !== undefined,
  );
}

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingCta, setIsCheckingCta] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

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

  async function handleSubscriptionCtaClick() {
    if (isCheckingCta) {
      return;
    }

    setIsCheckingCta(true);

    try {
      let authResponse: Response;
      let authData: AuthMeResponse | null;

      try {
        authResponse = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        authData = (await authResponse.json().catch(() => null)) as AuthMeResponse | null;
      } catch (error) {
        console.error("Failed to check authentication", error);
        router.push(loginHref);
        return;
      }

      if (!authResponse.ok || !authData?.user?.id) {
        router.push(loginHref);
        return;
      }

      let subscriptionResponse: Response;

      try {
        subscriptionResponse = await fetch("/api/subscriptions/me", {
          cache: "no-store",
          credentials: "include",
        });
      } catch (error) {
        console.error("Failed to check subscription", error);
        router.push(selectPlanHref);
        return;
      }

      if (subscriptionResponse.status === 404) {
        router.push(selectPlanHref);
        return;
      }

      const subscriptionData = await subscriptionResponse.json().catch(() => null);

      if (!subscriptionResponse.ok) {
        console.error("Failed to check subscription", subscriptionResponse.status, subscriptionData);
        router.push(selectPlanHref);
        return;
      }

      router.push(hasExistingSubscription(subscriptionData) ? dashboardHref : selectPlanHref);
    } catch (error) {
      console.error("Failed to check CTA destination", error);
      router.push(selectPlanHref);
    } finally {
      setIsCheckingCta(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f5ee] text-black">
      <header className="sticky top-0 z-50 border-b-2 border-[#1db788]/30 bg-[#fffdf7]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <BrandMark />

          {isAuthenticated ? (
            <div className="flex items-center justify-end gap-2 sm:gap-4">
              <Link href="/dashboard" className="px-3 py-2 text-sm font-extrabold text-black hover:text-[#13b987]">
                Dashboard
              </Link>
              <Link
                href="/profile"
                aria-label="Profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <ProfileIcon />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login" className="px-3 py-2 text-sm font-extrabold text-black hover:text-[#13b987]">
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-full border-2 border-[#1db788]/40 bg-[#13b987] px-5 py-2 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden border-b-2 border-[#1db788]/30 bg-[#fffdf7]">
        <HeroFoodDecorations />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <span className="inline-flex items-center rounded-full border-2 border-[#1db788]/40 bg-white px-4 py-2 text-xs font-black text-black shadow-sm sm:text-sm">
            Fresh & Healthy Meal Subscription
          </span>

          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-[#13b987] sm:text-7xl lg:text-8xl">
            Makanan Sehat, Diantar Setiap Hari.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-neutral-700 sm:text-lg">
            Meal kit segar dengan resep praktis yang dirancang ahli gizi. Hemat waktu, tetap sehat!
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleSubscriptionCtaClick}
              disabled={isCheckingCta}
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-[#13b987] px-7 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] sm:w-auto"
            >
              Mulai Berlangganan
              <span aria-hidden="true" className="ml-2">
                -&gt;
              </span>
            </button>
            <Link
              href="#features"
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-white px-7 py-3 text-sm font-black text-black shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] sm:w-auto"
            >
              Pelajari Lebih Lanjut
            </Link>
          </div>

          <HeroPreviewCard />

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["10K+", "Member Aktif"],
              ["50+", "Menu Variatif"],
              ["4.9", "Rating Pengguna"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[18px] border-2 border-[#1db788]/40 bg-white px-4 py-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                <p className="text-4xl font-black tracking-tight text-[#13b987]">{value}</p>
                <p className="mt-1 text-sm font-bold text-neutral-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            align="left"
            title="Kenapa Pilih FromFram?"
            subtitle="Kami berkomitmen memberikan pengalaman terbaik untuk gaya hidup sehat Anda."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[14px] border-2 border-[#1db788]/40 bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] border-2 border-[#1db788]/40 bg-[#13b987] text-white">
                  <FeatureIcon icon={feature.icon} />
                </div>
                <h3 className="mt-5 text-xl font-black tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#f0ece4] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Cara Kerjanya" subtitle="Mudah dan praktis, hanya 4 langkah." />

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <article
                key={step.number}
                className={`rounded-[14px] border-2 border-[#1db788]/40 p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${step.tone}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                  {step.number}
                </span>
                <h3 className="mt-7 text-lg font-black tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-700">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Kata Mereka Tentang FromFram"
            subtitle="Ribuan pelanggan puas dengan layanan kami."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article
                key={testimonial.name}
                className={`rounded-[14px] border-2 border-[#1db788]/40 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.10)] ${testimonial.tilt}`}
              >
                <StarRow />
                <p className="mt-5 text-base font-bold leading-7 text-neutral-800">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-[#13b987] text-sm font-black text-white">
                    {testimonial.initial}
                  </span>
                  <div>
                    <p className="font-black tracking-tight">{testimonial.name}</p>
                    <p className="text-xs font-semibold text-neutral-500">{testimonial.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Pilih Paket Sehatmu"
            subtitle="Investasi terbaik untuk kesehatan, fleksibel dengan kebutuhanmu."
          />

          <div className="mt-12 grid items-end gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-[18px] border-2 border-[#1db788]/40 p-7 shadow-[0_10px_24px_rgba(15,23,42,0.10)] ${
                  plan.popular ? "bg-[#cdf5dd] lg:-translate-y-4" : "bg-white"
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#1db788]/40 bg-[#13b987] px-4 py-1 text-xs font-black text-white">
                    TERPOPULER
                  </span>
                ) : null}

                <h3 className="text-xl font-black">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <p className="text-4xl font-black leading-none tracking-tight">{plan.price}</p>
                  <span className="pb-1 text-sm font-black text-neutral-700">{plan.period}</span>
                </div>
                <p className="mt-4 min-h-12 text-sm font-bold leading-6 text-[#07845e]">{plan.description}</p>

                <ul className="mt-8 space-y-4">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3 text-sm font-bold">
                      <CheckIcon active={plan.popular && benefit.includes("Discount")} />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={handleSubscriptionCtaClick}
                  disabled={isCheckingCta}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 px-6 py-3 text-sm font-black shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] ${
                    plan.popular ? "bg-[#13b987] text-white hover:bg-[#0f9f73]" : "bg-white text-black"
                  }`}
                >
                  Pilih Paket
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#f8f5ee] py-18 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Pertanyaan yang Sering Diajukan" />

          <div className="mt-10 space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={item.question} className="rounded-[14px] border-2 border-[#1db788]/40 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-black sm:text-base"
                    aria-expanded={isOpen}
                  >
                    {item.question}
                    <span className="text-xl leading-none">{isOpen ? "-" : "+"}</span>
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
        </div>
      </section>

      <section className="border-b-2 border-[#1db788]/30 bg-[#064E3B] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Siap Untuk Hidup Lebih Sehat?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/75 sm:text-lg">
            Bergabung dengan ribuan member yang sudah merasakan manfaatnya.
          </p>
          <button
            type="button"
            onClick={handleSubscriptionCtaClick}
            disabled={isCheckingCta}
            className="mt-9 inline-flex rounded-full border-2 border-[#1db788] bg-[#13b987] px-7 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(255,255,255,0.18)]"
          >
            Daftar Sekarang - Gratis 7 Hari
          </button>
        </div>
      </section>

      <footer className="bg-[#fffdf7]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-sm text-sm font-semibold leading-6 text-neutral-600">
              Fresh meals, delivered daily. Makan sehat jadi lebih mudah tanpa repot.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-black">{group.title}</h3>
              <div className="mt-5 space-y-3">
                {group.links.map((label) => (
                  <a
                    key={label}
                    href="#"
                    onClick={(event) => event.preventDefault()}
                    className="block text-sm font-semibold text-neutral-600 hover:text-[#13b987]"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-7xl border-t-2 border-[#1db788]/30 px-4 py-7 text-sm font-semibold text-neutral-600 sm:px-6 lg:px-8">
          &copy; 2024 FromFram. All rights reserved.
        </div>
      </footer>
    </main>
  );
}