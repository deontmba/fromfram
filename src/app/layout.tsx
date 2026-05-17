import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fromfram.com"),
  title: "FromFram — Meal Kit Sehat Harian",
  description:
    "Meal kit segar dengan resep praktis yang dirancang ahli gizi. Hemat waktu, tetap sehat. Diantar setiap hari ke rumah Anda.",
  openGraph: {
    title: "FromFram — Meal Kit Sehat Harian",
    description: "Meal kit segar dengan resep praktis yang dirancang ahli gizi.",
    url: "https://fromfram.com",
    siteName: "FromFram",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${poppins.variable} overflow-x-hidden antialiased`}>{children}</body>
    </html>
  );
}