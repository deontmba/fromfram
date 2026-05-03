import Image from "next/image";
import Link from "next/link";

type DeliveryStatus = "delivered" | "shipping" | "ready";

type CurrentWeekItem = {
  day: string;
  menu: string;
  status: DeliveryStatus;
  statusLabel: string;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: "history" | "address" | "payment";
  tone: "green" | "teal" | "red";
};

const dashboardData = {
  subscription: {
    label: "Subscription",
    plan: "Bulanan Plan",
    servings: "2 orang",
    status: "ACTIVE",
    nextBilling: "6 Apr 2026",
  },
  currentWeek: {
    title: "Minggu Ini (Week 1)",
    dateRange: "6 Mar 2026 - 12 Mar 2026",
    items: [
      {
        day: "Senin",
        menu: "Nasi Goreng Kampung",
        status: "delivered",
        statusLabel: "Terkirim",
      },
      {
        day: "Selasa",
        menu: "Ayam Teriyaki Bowl",
        status: "delivered",
        statusLabel: "Terkirim",
      },
      {
        day: "Rabu",
        menu: "Spaghetti Carbonara",
        status: "shipping",
        statusLabel: "Dikirim",
      },
      {
        day: "Kamis",
        menu: "Nasi Hainan",
        status: "ready",
        statusLabel: "Siap",
      },
      {
        day: "Jumat",
        menu: "Beef Bulgogi",
        status: "ready",
        statusLabel: "Siap",
      },
      {
        day: "Sabtu",
        menu: "Tom Yum Seafood",
        status: "ready",
        statusLabel: "Siap",
      },
      {
        day: "Minggu",
        menu: "Rendang Sapi",
        status: "ready",
        statusLabel: "Siap",
      },
    ] satisfies CurrentWeekItem[],
  },
  nextWeek: {
    title: "Minggu Depan (Week 2)",
    dateRange: "13 Mar 2026 - 19 Mar 2026",
    heading: "Pilih Menu Minggu Depan",
    deadline: "10 Mar 2026",
    selectedMenu: "0/7 hari",
    reminder: "Jika tidak memilih sebelum deadline, sistem akan otomatis memilihkan menu.",
    timeLeft: "4 hari lagi",
  },
  quickActions: [
    {
      title: "Riwayat Pesanan",
      description: "Lihat semua weekly box",
      href: "/dashboard/order-history",
      icon: "history",
      tone: "green",
    },
    {
      title: "Alamat Pengiriman",
      description: "Kelola alamat Anda",
      href: "/profile/address",
      icon: "address",
      tone: "teal",
    },
    {
      title: "Payment History",
      description: "Riwayat transaksi",
      href: "/dashboard/payment-history",
      icon: "payment",
      tone: "red",
    },
  ] satisfies QuickAction[],
};

const statusStyles: Record<DeliveryStatus, string> = {
  delivered: "bg-[#dff3e9] text-[#118765]",
  shipping: "bg-[#dcfbf5] text-[#0a8c80]",
  ready: "bg-[#fde6e6] text-[#d45b5b]",
};

const actionIconStyles: Record<QuickAction["tone"], string> = {
  green: "bg-[#e1f6ee] text-[#11a67d]",
  teal: "bg-[#d7f7ef] text-[#11a994]",
  red: "bg-[#ffe4e2] text-[#ee6a68]",
};

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

function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
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

function BoxIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m4 7.5 8 4.5 8-4.5M12 12v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 3v4M16 3v4M4 10h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChefHatIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 11.5a4 4 0 0 1 6-5.1 4 4 0 0 1 6 5.1V19H6v-7.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v6M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 4v6h6M5 13a7 7 0 1 0 2-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CardIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function QuickActionIcon({ icon }: { icon: QuickAction["icon"] }) {
  if (icon === "history") {
    return <HistoryIcon className="h-5 w-5" />;
  }

  if (icon === "address") {
    return <PinIcon className="h-5 w-5" />;
  }

  return <CardIcon className="h-5 w-5" />;
}

function WeekHeader({
  icon,
  title,
  dateRange,
}: {
  icon: "box" | "calendar";
  title: string;
  dateRange: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#dff7ee] text-[#14af84]">
          {icon === "box" ? <BoxIcon /> : <CalendarIcon />}
        </span>
        <h2 className="text-[0.98rem] font-bold text-neutral-950">{title}</h2>
      </div>
      <p className="text-sm text-neutral-500">{dateRange}</p>
    </div>
  );
}

export function DashboardScreen() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandMark />
          <Link
            href="/profile"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#12b886] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(18,184,134,0.18)] transition hover:bg-[#0fa878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
          >
            <UserIcon />
            Profil
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1080px] px-5 py-5">
        <section className="rounded-lg bg-[#07a982] px-5 py-5 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">
                {dashboardData.subscription.label}
              </p>
              <h1 className="mt-1 text-[1.35rem] font-bold leading-tight tracking-[-0.02em]">
                {dashboardData.subscription.plan}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white">
                <span>{dashboardData.subscription.servings}</span>
                <span className="h-1 w-1 rounded-full bg-white" />
                <span>{dashboardData.subscription.status}</span>
              </div>
            </div>

            <div className="w-fit rounded-lg bg-white/12 px-4 py-3 text-right">
              <p className="text-xs font-semibold text-white/65">Next Billing</p>
              <p className="mt-1 text-[1.2rem] font-bold leading-none">
                {dashboardData.subscription.nextBilling}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-neutral-200 bg-white px-5 py-5 shadow-[0_3px_12px_rgba(15,23,42,0.13)]">
            <WeekHeader
              icon="box"
              title={dashboardData.currentWeek.title}
              dateRange={dashboardData.currentWeek.dateRange}
            />

            <div className="mt-6 space-y-3">
              {dashboardData.currentWeek.items.map((item) => (
                <article
                  key={item.day}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-[#f3f3f2] px-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#14af84]">
                      <ChefHatIcon />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-neutral-950">{item.day}</h3>
                      <p className="truncate text-sm text-neutral-500">{item.menu}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}
                  >
                    {item.statusLabel}
                  </span>
                </article>
              ))}
            </div>

            <Link
              href="/dashboard/tracking"
              className="mt-7 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#12b886] px-4 text-sm font-bold text-white shadow-[0_8px_16px_rgba(18,184,134,0.25)] transition hover:bg-[#0fa878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
            >
              Lihat Detail Tracking
            </Link>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white px-5 py-5 shadow-[0_3px_12px_rgba(15,23,42,0.13)] lg:min-h-[588px]">
            <WeekHeader
              icon="calendar"
              title={dashboardData.nextWeek.title}
              dateRange={dashboardData.nextWeek.dateRange}
            />

            <div className="mt-6 rounded-lg border border-[#ffc6c3] bg-[#fff1f1] p-4">
              <div className="flex gap-3">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#ff6767]" />
                <div>
                  <h3 className="text-sm font-bold text-neutral-950">
                    {dashboardData.nextWeek.heading}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-500">
                    Deadline:{" "}
                    <span className="font-medium text-[#ff6767]">
                      {dashboardData.nextWeek.deadline}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Menu: {dashboardData.nextWeek.selectedMenu}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[#ade5dc] bg-[#eafffb] p-4">
              <div className="flex gap-3">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#0a8c80]" />
                <div>
                  <p className="text-sm leading-6 text-neutral-800">
                    {dashboardData.nextWeek.reminder}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#08a77d]">
                    Sisa waktu: {dashboardData.nextWeek.timeLeft}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/subscription/weekly-menu"
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#ff666d] px-4 text-sm font-bold text-white shadow-[0_8px_16px_rgba(255,102,109,0.24)] transition hover:bg-[#f05a61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb0b4]"
            >
              Pilih Menu Sekarang
            </Link>
          </section>
        </div>

        <section aria-label="Aksi cepat" className="mt-5 grid gap-5 md:grid-cols-3">
          {dashboardData.quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex min-h-16 items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#a7dec9] hover:shadow-[0_8px_16px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${actionIconStyles[action.tone]}`}
              >
                <QuickActionIcon icon={action.icon} />
              </span>
              <span>
                <span className="block text-sm font-bold text-neutral-950">{action.title}</span>
                <span className="mt-1 block text-sm text-neutral-500">{action.description}</span>
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
