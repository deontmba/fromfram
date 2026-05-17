import type { Feature, Step, Testimonial, PricingPlan, FaqItem, FooterGroup } from "@/types/landing";

export const LANDING_FEATURES: Feature[] = [
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

export const LANDING_STEPS: Step[] = [
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

export const LANDING_TESTIMONIALS: Testimonial[] = [
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

export const LANDING_PRICING_PLANS: PricingPlan[] = [
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

export const LANDING_FAQ_ITEMS: FaqItem[] = [
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

export const LANDING_FOOTER_GROUPS: FooterGroup[] = [
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

export const LANDING_STATS = [
  { value: "10K+", label: "Member Aktif" },
  { value: "50+", label: "Menu Variatif" },
  { value: "4.9", label: "Rating Pengguna" },
] as const;

export const LANDING_ROUTES = {
  login: "/login",
  selectPlan: "/subscription/select-plan",
  dashboard: "/dashboard",
  about: "/about"
} as const;

export const TEAM_MEMBERS = [
  { name: "Gideon Tamba", role: "Project Manager", image: "/images/gideon.png" },
  { name: "Michael Jordan Alfanius", role: "Frontend Developer", image: "/images/michael.png" },
  { name: "Abdul Aziz Rantizi", role: "Frontend Developer", image: "/images/rantizi.png" },
  { name: "Hafizh Fadhl Muhammad", role: "Backend Developer", image: "/images/hafizh.png" },
  { name: "Mochammad Kaindra Kareef", role: "Backend Developer", image: "/images/kaindra.png" },
  { name: "Bim Yusuf Karang", role: "Backend Developer", image: "/images/bim.png" },
] as const;