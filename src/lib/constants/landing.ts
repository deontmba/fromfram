import type { FooterGroup } from "@/types/landing";

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

export const TEAM_MEMBERS = [
  { name: "Gideon Tamba", role: "Project Manager", image: "/images/gideon.png" },
  { name: "Michael Jordan Alfanius", role: "Frontend Developer", image: "/images/michael.png" },
  { name: "Abdul Aziz Rantizi", role: "Frontend Developer", image: "/images/rantizi.png" },
  { name: "Hafizh Fadhl Muhammad", role: "Backend Developer", image: "/images/hafizh.png" },
  { name: "Mochammad Kaindra Kareef", role: "Backend Developer", image: "/images/kaindra.png" },
  { name: "Bim Yusuf Karang", role: "Backend Developer", image: "/images/bim.png" },
] as const;
