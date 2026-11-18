import Link from "next/link";
import { CustomerPage } from "@/components/ui/customer-page";

export default function ProfileSecurityPage() {
  return (
    <CustomerPage title="Password" backHref="/profile" backLabel="Profil">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">Ubah password</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Kami kirim tautan ke email akunmu. Buka tautan itu untuk membuat password baru.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#13b987] px-6 text-[0.95rem] font-semibold text-white transition hover:bg-[#0f996f]"
        >
          Kirim tautan ubah password
        </Link>
      </section>
    </CustomerPage>
  );
}
