"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
    avatarUrl?: string;
    createdAt?: string;
  };
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  imageUrl: string | null;
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

const contributors = [
  { name: "Gideon Tamba", role: "Project Manager", image: "/images/gideon.png" },
  { name: "Hafizh Fadhl Muhammad", role: "Backend Developer", image: "/images/hafizh.png" },
  { name: "Mochammad Kaindra Kareef", role: "Backend Developer", image: "/images/kaindra.png" },
  { name: "Bim Yusuf Karang", role: "Backend Developer", image: "/images/bim.png" },
  { name: "Michael Jordan Alfanius Sianipar", role: "Frontend Developer", image: "/images/michael.png" },
  { name: "Abdul Aziz Rantizi", role: "Frontend Developer", image: "/images/rantizi.png" },
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
        <path d="M20 4S13 3 8.5 7.5C5 11 5 16 5 16s5 0 8.5-3.5C18 8 20 4 20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20c1.5-2.5 3.4-4.4 5.8-5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "chef") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <path d="M7 10h10a3 3 0 0 1 3 3v4H4v-4a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 10V9a4 4 0 1 1 8 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "clock") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "truck") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <path d="M3 7h11v8H3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 10h3l3 3v2h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="18" r="1.5" fill="currentColor" />
        <circle cx="17.5" cy="18" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  if (icon === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={iconClassName}>
      <path d="M12 4 6.5 6v5c0 4 2.5 7.2 5.5 9 3-1.8 5.5-5 5.5-9V6L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9.5 12 2 2 3-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
      <motion.div initial={{ x: -100, opacity: 0, rotate: -40 }} animate={{ x: 0, opacity: 1, rotate: -20 }} transition={{ duration: 1, delay: 0.2 }} className="absolute -left-60 top-20 h-auto w-[420px] xl:-left-52 xl:w-[620px]">
        <Image src="/images/brocolli.png" alt="" width={680} height={680} priority sizes="(min-width: 1280px) 620px, 420px" />
      </motion.div>
      <motion.div initial={{ y: 100, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 10 }} transition={{ duration: 1, delay: 0.4 }} className="absolute -bottom-24 -left-16 h-auto w-[420px]">
        <Image src="/images/cheese.png" alt="" width={464} height={464} sizes="420px" />
      </motion.div>
      <motion.div initial={{ x: 100, opacity: 0, rotate: 30 }} animate={{ x: 0, opacity: 1, rotate: 9 }} transition={{ duration: 1, delay: 0.3 }} className="absolute -right-16 top-24 h-auto w-[300px] xl:right-4 xl:w-[390px]">
        <Image src="/images/milk.png" alt="" width={528} height={528} priority sizes="(min-width: 1280px) 390px, 300px" />
      </motion.div>
      <motion.div initial={{ y: 100, opacity: 0, rotate: 10 }} animate={{ y: 0, opacity: 1, rotate: -8 }} transition={{ duration: 1, delay: 0.5 }} className="absolute -right-56 bottom-20 h-auto w-[580px] xl:-right-40">
        <Image src="/images/salmon.png" alt="" width={760} height={760} sizes="580px" />
      </motion.div>
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
        <path d="M2.2 6.1 4.8 8.7 9.8 3.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExistingSubscription(payload: unknown) {
  if (payload === null || payload === undefined) return false;
  const subscription = isRecord(payload) && "data" in payload ? payload.data : isRecord(payload) && "subscription" in payload ? payload.subscription : payload;
  if (!isRecord(subscription)) return false;
  if (typeof subscription.id === "string" && subscription.id.trim().length > 0) return true;
  return ["planId", "plan", "status", "startDate", "endDate", "currentPeriodEnd"].some((key) => subscription[key] !== null && subscription[key] !== undefined);
}

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthMeResponse["user"] | null>(null);
  const [isCheckingCta, setIsCheckingCta] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as AuthMeResponse | null;

        if (!isMounted) return;

        if (response.ok && data?.user?.id) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (isMounted) setIsAuthenticated(false);
      }
    }

    async function fetchRecipes() {
      try {
        const res = await fetch('/api/public/recipes');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setRecipes(data);
        }
      } catch (err) {
        console.error("Failed to fetch recipes", err);
      } finally {
        if (isMounted) setIsLoadingRecipes(false);
      }
    }

    void loadSession();
    void fetchRecipes();

    return () => { isMounted = false; };
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  async function handleSubscriptionCtaClick() {
    if (isCheckingCta) return;
    setIsCheckingCta(true);

    try {
      let authResponse: Response;
      let authData: AuthMeResponse | null;

      try {
        authResponse = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        authData = (await authResponse.json().catch(() => null)) as AuthMeResponse | null;
      } catch (error) {
        router.push(loginHref);
        return;
      }

      if (!authResponse.ok || !authData?.user?.id) {
        router.push(loginHref);
        return;
      }

      let subscriptionResponse: Response;
      try {
        subscriptionResponse = await fetch("/api/subscriptions/me", { cache: "no-store", credentials: "include" });
      } catch (error) {
        router.push(selectPlanHref);
        return;
      }

      if (subscriptionResponse.status === 404) {
        router.push(selectPlanHref);
        return;
      }

      const subscriptionData = await subscriptionResponse.json().catch(() => null);
      if (!subscriptionResponse.ok) {
        router.push(selectPlanHref);
        return;
      }

      router.push(hasExistingSubscription(subscriptionData) ? dashboardHref : selectPlanHref);
    } catch (error) {
      router.push(selectPlanHref);
    } finally {
      setIsCheckingCta(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f5ee] text-black scroll-smooth">
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b-2 border-[#1db788]/30 bg-[#fffdf7]/95 backdrop-blur shadow-sm"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <BrandMark />

          <nav className="hidden md:flex items-center gap-8">
            <a href="#" onClick={(e) => scrollToSection(e, 'top')} className="group relative text-sm font-extrabold text-black hover:text-[#13b987] transition cursor-pointer">
              Beranda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#13b987] transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#menu" onClick={(e) => scrollToSection(e, 'menu')} className="group relative text-sm font-extrabold text-black hover:text-[#13b987] transition cursor-pointer">
              Menu
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#13b987] transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#tentang-kami" onClick={(e) => scrollToSection(e, 'tentang-kami')} className="group relative text-sm font-extrabold text-black hover:text-[#13b987] transition cursor-pointer">
              Tentang Kami
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#13b987] transition-all duration-300 group-hover:w-full"></span>
            </a>
          </nav>

          {isAuthenticated ? (
            <div className="flex items-center justify-end gap-2 sm:gap-4">
              <Link href="/dashboard" className="hidden sm:block text-sm font-extrabold text-black hover:text-[#13b987] transition group relative">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#13b987] transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link
                href="/profile"
                aria-label="Profile"
                className="inline-flex h-10 w-10 overflow-hidden items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {user?.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="Profile" width={40} height={40} className="h-full w-full object-cover" />
                ) : (
                  <ProfileIcon />
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login" className="px-3 py-2 text-sm font-extrabold text-black hover:text-[#13b987] transition">
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
      </motion.header>

      <section className="relative overflow-hidden border-b-2 border-[#1db788]/30 bg-gradient-to-b from-[#f2faf5] to-[#fffdf7]">
        <HeroFoodDecorations />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <motion.span 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border-2 border-[#1db788]/40 bg-white px-4 py-2 text-xs font-black text-[#13b987] shadow-sm sm:text-sm"
          >
            ✨ Fresh & Healthy Meal Subscription
          </motion.span>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1, type: "spring" }}
            className="mx-auto mt-8 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-[#087b58] sm:text-7xl lg:text-8xl"
          >
            Makanan Sehat, <br/><span className="text-[#13b987]">Diantar Setiap Hari.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-neutral-700 sm:text-lg"
          >
            Meal kit segar dengan resep praktis yang dirancang ahli gizi. Hemat waktu, tetap sehat, dan nikmati setiap hidangannya!
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <button
              type="button"
              onClick={handleSubscriptionCtaClick}
              disabled={isCheckingCta}
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-[#13b987] px-7 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] sm:w-auto cursor-pointer"
            >
              Mulai Berlangganan
              <span aria-hidden="true" className="ml-2">-&gt;</span>
            </button>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 bg-white px-7 py-3 text-sm font-black text-black shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] sm:w-auto cursor-pointer"
            >
              Pelajari Lebih Lanjut
            </a>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }}
            className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {[
              ["10K+", "Member Aktif"],
              ["50+", "Menu Variatif"],
              ["4.9", "Rating Pengguna"],
            ].map(([value, label], idx) => (
              <div key={label} className="rounded-[18px] border-2 border-[#1db788]/40 bg-white px-4 py-5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:scale-105">
                <p className="text-4xl font-black tracking-tight text-[#13b987]">{value}</p>
                <p className="mt-1 text-sm font-bold text-neutral-600">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading
              align="left"
              title="Kenapa Pilih FromFram?"
              subtitle="Kami berkomitmen memberikan pengalaman terbaik untuk gaya hidup sehat Anda."
            />
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="rounded-[14px] border-2 border-[#1db788]/40 bg-white p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-2 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] border-2 border-[#1db788]/40 bg-[#13b987] text-white">
                  <FeatureIcon icon={feature.icon} />
                </div>
                <h3 className="mt-5 text-xl font-black tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-600">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="menu" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#f2faf5] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading title="Eksplorasi Menu Kami" subtitle="Menu spesial kami yang selalu diperbarui, siap untuk dinikmati." />
          </motion.div>

          {isLoadingRecipes ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col rounded-[16px] border-2 border-neutral-200 bg-white p-4">
                  <div className="h-48 rounded-xl bg-neutral-200 mb-4" />
                  <div className="h-6 w-2/3 bg-neutral-200 rounded mb-2" />
                  <div className="h-4 w-full bg-neutral-200 rounded mb-4" />
                  <div className="flex gap-2 mt-auto">
                    <div className="h-6 w-16 bg-neutral-200 rounded-full" />
                    <div className="h-6 w-16 bg-neutral-200 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recipes.slice(0, 6).map((recipe, idx) => (
                <motion.article
                  key={recipe.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="flex flex-col rounded-[16px] border-2 border-[#1db788]/40 bg-white overflow-hidden shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-2 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative h-48 w-full bg-neutral-100">
                    {recipe.imageUrl ? (
                      <Image src={recipe.imageUrl} alt={recipe.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400 font-bold">No Image</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-black tracking-tight text-neutral-900">{recipe.name}</h3>
                    <p className="mt-2 text-sm text-neutral-600 line-clamp-2">{recipe.description}</p>
                    <div className="mt-auto pt-4 flex items-center gap-2">
                      <span className="inline-flex rounded-full bg-[#e5f8ed] px-2.5 py-0.5 text-xs font-extrabold text-[#087b58]">
                        {recipe.calories} kcal
                      </span>
                      <span className="inline-flex rounded-full bg-[#e5f8ed] px-2.5 py-0.5 text-xs font-extrabold text-[#087b58]">
                        {recipe.protein}g protein
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#f0ece4] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading title="Cara Kerjanya" subtitle="Mudah dan praktis, hanya 4 langkah." />
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, type: "spring" }}
                className={`rounded-[14px] border-2 border-[#1db788]/40 p-6 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:scale-105 ${step.tone}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                  {step.number}
                </span>
                <h3 className="mt-7 text-lg font-black tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-700">{step.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading
              title="Kata Mereka Tentang FromFram"
              subtitle="Ribuan pelanggan puas dengan layanan kami."
            />
          </motion.div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial, idx) => (
              <motion.article
                key={testimonial.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className={`rounded-[14px] border-2 border-[#1db788]/40 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition hover:shadow-xl ${testimonial.tilt}`}
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
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="tentang-kami" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-gradient-to-b from-[#fffdf7] to-[#f2faf5] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading title="Tentang Kami" subtitle="Para kreator di balik FromFram yang berdedikasi membangun platform sehat ini." />
          </motion.div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {contributors.map((member, idx) => (
              <motion.div 
                key={member.name}
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, type: "spring" }}
                className="group flex flex-col items-center text-center"
              >
                <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-[#1db788]/40 shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:border-[#13b987]">
                  <Image src={member.image} alt={member.name} fill className="object-cover" />
                </div>
                <h3 className="mt-6 text-xl font-black text-neutral-900 transition-colors group-hover:text-[#13b987]">{member.name}</h3>
                <p className="mt-1 text-sm font-bold text-neutral-500">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading
              title="Pilih Paket Sehatmu"
              subtitle="Investasi terbaik untuk kesehatan, fleksibel dengan kebutuhanmu."
            />
          </motion.div>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan, idx) => (
              <motion.article
                key={plan.name}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className={`relative flex flex-col rounded-[18px] border-2 border-[#1db788]/40 p-7 shadow-[0_10px_24px_rgba(15,23,42,0.10)] transition hover:-translate-y-2 hover:shadow-2xl ${
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
                  className={`mt-auto inline-flex w-full items-center justify-center rounded-full border-2 border-[#1db788]/40 px-6 py-3 text-sm font-black shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] cursor-pointer ${
                    plan.popular ? "bg-[#13b987] text-white hover:bg-[#0f9f73]" : "bg-white text-black hover:bg-neutral-50"
                  }`}
                >
                  Pilih Paket
                </button>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-b-2 border-[#1db788]/30 bg-[#f8f5ee] py-18 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading title="Pertanyaan yang Sering Diajukan" />
          </motion.div>

          <div className="mt-10 space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;

              return (
                <motion.div 
                  key={item.question} 
                  initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="rounded-[14px] border-2 border-[#1db788]/40 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-black sm:text-base cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    {item.question}
                    <span className="text-xl leading-none">{isOpen ? "-" : "+"}</span>
                  </button>
                  {isOpen ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t-2 border-[#1db788]/30 px-5 py-4 text-sm font-semibold leading-6 text-neutral-600">
                      {item.answer}
                    </motion.div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#1db788]/30 bg-[#064E3B] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Siap Untuk Hidup Lebih Sehat?
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-white/75 sm:text-lg">
            Bergabung dengan ribuan member yang sudah merasakan manfaatnya.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }}
            type="button"
            onClick={handleSubscriptionCtaClick}
            disabled={isCheckingCta}
            className="mt-9 inline-flex rounded-full border-2 border-[#1db788] bg-[#13b987] px-7 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(255,255,255,0.12)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(255,255,255,0.18)]"
          >
            Daftar Sekarang - Gratis 7 Hari
          </motion.button>
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
          &copy; 2026 FromFram. All rights reserved.
        </div>
      </footer>
    </main>
  );
}