"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, UserRound } from "lucide-react";

type Feature = {
  stat: string;
  label: string;
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

type PricingPlan = {
  name: string;
  price: string;
  period: string;
  perWeek?: string;
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
  { stat: "7", label: "nilai gizi tercatat di tiap menu" },
  { stat: "1-6", label: "porsi, bahan sudah ditimbang" },
  { stat: "2x", label: "antar sehari, siang dan malam" },
  { stat: "0", label: "kontrak, berhenti kapan saja" },
];

const steps: Step[] = [
  {
    number: "01",
    title: "Pilih Paket",
    description: "Tentukan durasi langganan, jumlah porsi, dan target kesehatanmu.",
  },
  {
    number: "02",
    title: "Atur Menu",
    description: "Pilih menu makan siang dan malam tiap minggu dari racikan ahli gizi.",
  },
  {
    number: "03",
    title: "Terima Paket",
    description: "Bahan segar yang sudah diporsi diantar langsung ke alamatmu.",
  },
  {
    number: "04",
    title: "Masak & Nikmati",
    description: "Ikuti resep praktis, hidangan sehat siap dalam sekitar 15 menit.",
  },
];

const testimonials: Testimonial[] = [
  { name: "Sarah Wijaya", role: "Ibu rumah tangga", initial: "S", quote: "Sekarang saya punya lebih banyak waktu untuk keluarga tanpa pusing soal menu sehat." },
  { name: "Ahmad Rizki", role: "Rutin gym", initial: "A", quote: "Menu bulking-nya pas untuk program latihan saya. Protein tinggi dan rasanya enak." },
  { name: "Linda Kusuma", role: "Ibu bekerja", initial: "L", quote: "Gak perlu mikir menu lagi. Tinggal masak 15 menit, makan malam langsung siap." },
  { name: "Dimas Pratama", role: "Mahasiswa", initial: "D", quote: "Bahannya sudah ditimbang, jadi gak ada sisa sayur busuk di kulkas lagi." },
  { name: "Nadia Putri", role: "Desainer", initial: "N", quote: "Label gizinya lengkap. Saya jadi tahu persis berapa kalori yang saya makan." },
  { name: "Rudi Hartono", role: "Karyawan swasta", initial: "R", quote: "Kirim ke kantor siang, ke rumah malam. Alamatnya bisa diatur per hari." },
  { name: "Maya Anggraini", role: "Program diet", initial: "M", quote: "Turun 4 kg dalam dua bulan tanpa merasa kelaparan. Porsinya pas." },
  { name: "Fajar Nugroho", role: "Ayah dua anak", initial: "F", quote: "Satu paket cukup untuk empat orang. Anak-anak juga suka menunya." },
  { name: "Citra Lestari", role: "Pekerja remote", initial: "C", quote: "Minggu depan liburan? Tinggal skip, tanpa ribet hubungi CS." },
  { name: "Yoga Saputra", role: "Pelari", initial: "Y", quote: "Menunya ganti tiap minggu, jadi gak bosan. Selalu ada yang baru dicoba." },
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
    perWeek: "Rp 300.000 / minggu",
    description: "Hemat 14% dibanding paket mingguan",
    benefits: ["28 hari meal kit", "Gratis ongkir", "Layanan prioritas", "Hemat 14%"],
    popular: true,
  },
  {
    name: "Tahunan",
    price: "Rp 12.000.000",
    period: "/thn",
    perWeek: "± Rp 231.000 / minggu",
    description: "Hemat 34% dibanding paket mingguan",
    benefits: ["365 hari meal kit", "Gratis ongkir", "Layanan prioritas", "1 minggu gratis"],
  },
];

const faqItems: FaqItem[] = [
  {
    question: "Apakah bahan makanan sudah diporsi?",
    answer:
      "Ya, semua bahan sudah ditimbang dan diporsi sesuai resep, sehingga Anda tinggal memasaknya.",
  },
  {
    question: "Bagaimana cara memilih menu mingguan?",
    answer:
      "Setiap minggu ahli gizi kami menyiapkan daftar menu. Pilih menu makan siang dan makan malam untuk tiap hari dari halaman dashboard.",
  },
  {
    question: "Kapan batas waktu memilih menu?",
    answer:
      "Pilihan menu untuk minggu berikutnya ditutup setiap hari Minggu pukul 18.00 WIB. Setelah itu menu dikunci dan pesanan mulai disiapkan.",
  },
  {
    question: "Jam berapa paket diantar?",
    answer:
      "Makan siang diantar sekitar pukul 11.30 WIB dan makan malam sekitar pukul 17.30 WIB, setiap hari sesuai jadwal langganan Anda.",
  },
  {
    question: "Bisakah alamat pengiriman berbeda untuk tiap hari?",
    answer:
      "Bisa. Simpan beberapa alamat, misalnya rumah dan kantor, lalu atur alamat mana yang dipakai untuk tiap hari dan waktu makan.",
  },
  {
    question: "Untuk berapa orang satu paket?",
    answer:
      "Anda bisa memilih 1 sampai 6 porsi per waktu makan saat berlangganan, sesuai jumlah anggota keluarga.",
  },
  {
    question: "Apakah tersedia paket diet atau fitness?",
    answer:
      "Ya. Pilih target kesehatan seperti penurunan berat badan, menjaga berat badan, atau bulking, dan menu yang ditampilkan akan disesuaikan. Target bisa diganti kapan saja.",
  },
  {
    question: "Apakah informasi gizi dan alergen tersedia?",
    answer:
      "Setiap resep mencantumkan kalori, protein, karbohidrat, lemak, serat, gula, dan natrium per porsi. Bahan yang mengandung alergen ditandai oleh tim kami.",
  },
  {
    question: "Bagaimana jika saya sedang tidak di rumah satu minggu?",
    answer:
      "Lewati (skip) pengiriman minggu tersebut sebelum batas pemilihan menu, atau jeda langganan sampai tanggal yang Anda tentukan.",
  },
  {
    question: "Bisakah saya membatalkan langganan?",
    answer:
      "Bisa kapan saja. Langganan tetap aktif sampai akhir periode yang sudah dibayar, lalu berhenti otomatis tanpa tagihan berikutnya.",
  },
  {
    question: "Bisakah saya mengganti paket atau jumlah porsi?",
    answer:
      "Paket dan jumlah porsi bisa diubah sebelum pembayaran. Setelah lunas, perubahan berlaku untuk periode langganan berikutnya.",
  },
  {
    question: "Metode pembayaran apa saja yang tersedia?",
    answer:
      "Pembayaran diproses aman melalui Midtrans dengan QRIS (semua e-wallet dan mobile banking) atau transfer bank virtual account.",
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

/** Soft background ornaments: blurred blobs plus a faded dot grid. Pure CSS. */
function SectionDecor({ tone = "mint", flip = false }: { tone?: "mint" | "sand"; flip?: boolean }) {
  const blob = tone === "mint" ? "bg-[#13b987]/15" : "bg-[#f5c56b]/20";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <div className={`absolute h-80 w-80 rounded-full blur-3xl ${blob} ${flip ? "-left-24 -top-24" : "-right-24 -top-24"}`} />
      <div className={`absolute h-72 w-72 rounded-full bg-[#13b987]/10 blur-3xl ${flip ? "-bottom-32 -right-16" : "-bottom-32 -left-16"}`} />
      <div
        className={`absolute top-10 h-56 w-56 opacity-60 [background-image:radial-gradient(rgba(8,123,88,0.22)_1.5px,transparent_1.5px)] [background-size:18px_18px] [mask-image:radial-gradient(circle,black,transparent_70%)] ${flip ? "right-6" : "left-6"}`}
      />
    </div>
  );
}

const testimonialTones = [
  "bg-white text-neutral-800",
  "bg-[#087b58] text-white",
  "bg-[#fff1ce] text-neutral-800",
  "bg-[#d8f5e7] text-neutral-800",
];

function TestimonialCard({ item, index }: { item: Testimonial; index: number }) {
  const tone = testimonialTones[index % testimonialTones.length];
  const dark = tone.includes("text-white");
  return (
    <figure className={`flex h-full w-[300px] shrink-0 flex-col justify-between rounded-3xl p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:w-[360px] sm:p-7 ${tone}`}>
      <blockquote className="text-[1.05rem] font-medium leading-7">&ldquo;{item.quote}&rdquo;</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${dark ? "bg-white text-[#087b58]" : "bg-[#087b58] text-white"}`}>
          {item.initial}
        </span>
        <span>
          <span className="block text-sm font-bold">{item.name}</span>
          <span className={`block text-xs ${dark ? "text-white/70" : "text-neutral-500"}`}>{item.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Endless horizontal scroll (@keyframes marquee in globals.css). The list is rendered twice and shifted by half its width. */
function TestimonialMarquee({ items }: { items: Testimonial[] }) {
  return (
    <div className="group relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div className="flex w-max items-stretch animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...items, ...items].map((item, i) => (
          <div key={`${item.name}-${i}`} aria-hidden={i >= items.length} className="flex pr-5">
            <TestimonialCard item={item} index={i % items.length} />
          </div>
        ))}
      </div>
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
  const [openFaq, setOpenFaq] = useState<Set<number>>(() => new Set());
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
                  <UserRound aria-hidden="true" className="h-5 w-5" />
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
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1, type: "spring" }}
            className="mx-auto max-w-5xl text-5xl font-black leading-[1.02] tracking-tight text-balance text-[#087b58] sm:text-6xl lg:text-7xl xl:text-[5rem]"
          >
            Makanan Sehat, <br className="hidden sm:block" /><span className="text-[#13b987]">Diantar Setiap Hari.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-6 max-w-xl text-base leading-7 text-neutral-600 text-pretty sm:text-lg sm:leading-8"
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
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#13b987] px-7 py-3.5 text-[0.95rem] font-bold text-white shadow-[0_10px_24px_rgba(19,185,135,0.28)] transition hover:-translate-y-0.5 hover:bg-[#0f996f] disabled:opacity-70 sm:w-auto cursor-pointer"
            >
              {isCheckingCta ? "Memeriksa..." : "Mulai Berlangganan"}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="inline-flex w-full items-center justify-center rounded-full border border-neutral-300 bg-white/80 px-7 py-3.5 text-[0.95rem] font-semibold text-neutral-800 transition hover:border-neutral-400 hover:bg-white sm:w-auto cursor-pointer"
            >
              Pelajari Lebih Lanjut
            </a>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }}
            className="mx-auto mt-14 grid max-w-2xl grid-cols-3 divide-x divide-neutral-200 rounded-2xl border border-neutral-200 bg-white/90 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur"
          >
            {[
              ["10K+", "Member aktif"],
              ["50+", "Menu variatif"],
              ["4.9", "Rating pengguna"],
            ].map(([value, label]) => (
              <div key={label} className="px-2 sm:px-4">
                <p className="text-2xl font-black tracking-tight text-[#0f8f69] sm:text-4xl">{value}</p>
                <p className="mt-1 text-xs font-medium text-neutral-500 sm:text-sm">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="relative isolate scroll-mt-24 overflow-hidden border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <SectionDecor tone="sand" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading title="Makan sehat, tanpa harus mikir." />
          </motion.div>

          <dl className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-y-10 lg:grid-cols-4 lg:divide-x lg:divide-neutral-200">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="flex flex-col items-center px-4 text-center"
              >
                <dt className="order-2 mt-3 max-w-[12rem] text-[0.95rem] leading-6 text-neutral-600">{feature.label}</dt>
                <dd className="order-1 bg-gradient-to-br from-[#13b987] to-[#087b58] bg-clip-text text-6xl font-black leading-none tracking-tighter text-transparent sm:text-7xl">
                  {feature.stat}
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </section>

      <section id="menu" className="relative isolate scroll-mt-24 overflow-hidden border-b-2 border-[#1db788]/30 bg-[#f2faf5] py-18 sm:py-24">
        <SectionDecor flip />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading title="Menu baru setiap minggu" subtitle="Tinggal pilih yang kamu suka, sisanya kami yang siapkan." />
          </motion.div>

          {isLoadingRecipes ? (
            <div className="mt-12 grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`animate-pulse rounded-3xl bg-neutral-200/70 ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`} />
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <p className="mt-10 text-center text-neutral-500">Menu minggu ini sedang disiapkan ahli gizi kami.</p>
          ) : (
            <div className="mt-12 grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recipes.slice(0, 5).map((recipe, idx) => {
                const featured = idx === 0;
                return (
                  <motion.article
                    key={recipe.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: idx * 0.08 }}
                    className={`group relative overflow-hidden rounded-3xl bg-[#087b58] ${featured ? "sm:col-span-2 sm:row-span-2" : ""}`}
                  >
                    {recipe.imageUrl ? (
                      <Image
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        fill
                        sizes={featured ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                      <h3 className={`font-bold leading-tight tracking-tight ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}>
                        {recipe.name}
                      </h3>
                      {featured && recipe.description ? (
                        <p className="mt-2 line-clamp-2 max-w-md text-sm leading-6 text-white/80">{recipe.description}</p>
                      ) : null}
                      <p className="mt-2 text-sm font-medium text-white/85">
                        {recipe.calories} kcal &middot; {recipe.protein} g protein
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="relative isolate scroll-mt-24 overflow-hidden border-b-2 border-[#1db788]/30 bg-[#f0ece4] py-18 sm:py-24">
        <SectionDecor tone="sand" flip />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading title="Cara Kerjanya" subtitle="Atur sekali di awal, setiap minggu tinggal pilih menu." />
          </motion.div>

          <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, idx) => (
              <motion.li
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className="group flex flex-col rounded-3xl border border-black/5 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.10)]"
              >
                <span
                  aria-hidden="true"
                  className="block bg-gradient-to-br from-[#13b987] to-[#087b58] bg-clip-text text-[5.5rem] font-black leading-[0.85] tracking-tighter text-transparent sm:text-[6.5rem]"
                >
                  {step.number}
                </span>
                <span className="mt-6 h-1 w-10 rounded-full bg-[#13b987]/30 transition-all group-hover:w-16 group-hover:bg-[#13b987]" />
                <h3 className="mt-5 text-xl font-black tracking-tight text-neutral-900">
                  <span className="sr-only">Langkah {Number(step.number)}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-6 text-neutral-600">{step.description}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section id="testimonials" className="scroll-mt-24 overflow-hidden border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading
              title="Kata Mereka Tentang FromFram"
              subtitle="Dari mereka yang sudah berlangganan."
            />
          </motion.div>

        </div>

        <div className="mt-12">
          <TestimonialMarquee items={testimonials} />
        </div>
      </section>

      <section id="pricing" className="relative isolate scroll-mt-24 overflow-hidden border-b-2 border-[#1db788]/30 bg-[#fffdf7] py-18 sm:py-24">
        <SectionDecor />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading
              title="Pilih Paket Sehatmu"
              subtitle="Investasi terbaik untuk kesehatan, fleksibel dengan kebutuhanmu."
            />
          </motion.div>

          <div className="mx-auto mt-14 grid max-w-md items-stretch gap-6 lg:max-w-none lg:grid-cols-3">
            {pricingPlans.map((plan, idx) => (
              <motion.article
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className={`relative flex flex-col rounded-3xl bg-white p-7 transition hover:-translate-y-1 sm:p-8 ${
                  plan.popular
                    ? "border-2 border-[#13b987] shadow-[0_20px_40px_rgba(19,185,135,0.18)]"
                    : "border border-neutral-200 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-neutral-900">{plan.name}</h3>
                  {plan.popular ? (
                    <span className="rounded-full bg-[#13b987] px-3 py-1 text-xs font-semibold text-white">
                      Terpopuler
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <p className="text-[2.15rem] font-black leading-none tracking-tight text-neutral-900">{plan.price}</p>
                  <span className="text-sm font-medium text-neutral-500">{plan.period}</span>
                </div>
                <p className="mt-2 h-5 text-sm text-neutral-500">{plan.perWeek ?? ""}</p>

                <p className="mt-5 rounded-xl bg-[#effaf5] px-3.5 py-2.5 text-sm font-semibold text-[#07845e]">
                  {plan.description}
                </p>

                <ul className="mt-6 flex-1 space-y-3.5 border-t border-neutral-100 pt-6">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-[0.95rem] text-neutral-700">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d8f5e7] text-[#0f8f69]">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={handleSubscriptionCtaClick}
                  disabled={isCheckingCta}
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[0.95rem] font-bold transition cursor-pointer disabled:opacity-70 ${
                    plan.popular
                      ? "bg-[#13b987] text-white shadow-[0_10px_24px_rgba(19,185,135,0.28)] hover:bg-[#0f996f]"
                      : "border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50"
                  }`}
                >
                  Pilih {plan.name}
                </button>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative isolate scroll-mt-24 overflow-hidden border-b-2 border-[#1db788]/30 bg-[#f8f5ee] py-18 sm:py-24">
        <SectionDecor tone="sand" flip />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <SectionHeading
              title="Pertanyaan yang Sering Diajukan"
              subtitle="Semua yang perlu kamu tahu soal menu, pengiriman, dan langganan."
            />
          </motion.div>

          <div className="mt-12 grid items-start gap-3 lg:grid-cols-2 lg:gap-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaq.has(index);

              return (
                <motion.div 
                  key={item.question} 
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.35, delay: (index % 2) * 0.05 }}
                  className={`rounded-2xl border bg-white transition-colors ${isOpen ? "border-[#13b987]/60 shadow-[0_10px_24px_rgba(15,23,42,0.06)]" : "border-neutral-200 hover:border-neutral-300"}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq((prev) => {
                        const next = new Set(prev);
                        if (next.has(index)) next.delete(index);
                        else next.add(index);
                        return next;
                      })
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[0.95rem] font-semibold text-neutral-900 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    {item.question}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#13b987]" : ""}`}
                    />
                  </button>
                  {isOpen ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-5 pb-5 text-sm leading-6 text-neutral-600">
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

    </main>
  );
}