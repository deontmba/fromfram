import Link from "next/link";
import { CustomerPage } from "@/components/ui/customer-page";

const shortcuts = [
  { href: "/#faq", title: "Pertanyaan yang sering diajukan", desc: "Menu, jadwal antar, langganan, dan pembayaran." },
  { href: "/delivery", title: "Lacak pengiriman", desc: "Status pesanan hari ini dan minggu ini." },
  { href: "/subscription", title: "Kelola langganan", desc: "Lewati satu minggu, jeda, atau berhenti." },
  { href: "/dashboard/payment-history", title: "Riwayat pembayaran", desc: "Semua tagihan dan statusnya." },
];

export default function ProfileHelpPage() {
  return (
    <CustomerPage title="Bantuan" backHref="/profile" backLabel="Profil">
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {shortcuts.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block px-5 py-4 transition hover:bg-neutral-50">
              <span className="block font-semibold text-neutral-900">{item.title}</span>
              <span className="block text-sm text-neutral-500">{item.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </CustomerPage>
  );
}
