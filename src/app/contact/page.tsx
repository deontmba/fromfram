import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionReveal } from "@/components/motion/section-reveal";

export default function ContactPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f8f5ee] text-black">
      <Navbar />
      <div className="flex-grow py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionReveal>
            <SectionHeading
              title="Hubungi Kami"
              subtitle="Kami siap membantu Anda"
            />
          </SectionReveal>
          <SectionReveal>
            <div className="mt-12 rounded-3xl border-2 border-[#1db788]/30 bg-white p-8 shadow-sm">
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-black">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="mt-2 block w-full rounded-xl border-2 border-neutral-200 bg-[#f8f5ee] px-4 py-3 text-black focus:border-[#13b987] focus:outline-none focus:ring-0"
                    placeholder="Masukkan nama Anda"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-black">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="mt-2 block w-full rounded-xl border-2 border-neutral-200 bg-[#f8f5ee] px-4 py-3 text-black focus:border-[#13b987] focus:outline-none focus:ring-0"
                    placeholder="Masukkan email Anda"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-black">
                    Pesan
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="mt-2 block w-full rounded-xl border-2 border-neutral-200 bg-[#f8f5ee] px-4 py-3 text-black focus:border-[#13b987] focus:outline-none focus:ring-0"
                    placeholder="Tulis pesan Anda di sini"
                  ></textarea>
                </div>
                <button
                  type="button"
                  className="w-full rounded-full bg-[#13b987] px-6 py-3 text-center font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  Kirim Pesan
                </button>
              </form>
              <div className="mt-12 grid grid-cols-1 gap-6 border-t-2 border-neutral-100 pt-8 sm:grid-cols-2">
                <div>
                  <h4 className="font-bold text-black">Email</h4>
                  <p className="mt-1 text-sm text-neutral-600">support@fromfram.com</p>
                </div>
                <div>
                  <h4 className="font-bold text-black">Lokasi</h4>
                  <p className="mt-1 text-sm text-neutral-600">Bandung, Indonesia</p>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </div>
      <Footer />
    </main>
  );
}
