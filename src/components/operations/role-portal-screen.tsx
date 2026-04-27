"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./role-portal-screen.module.css";

type RoleVariant = "admin" | "nutritionist";

type TabItem = {
  id: string;
  label: string;
};

type KpiItem = {
  label: string;
  value: string;
  delta: string;
  icon: ReactNode;
};

type ActivityItem = {
  text: string;
  time: string;
  icon: ReactNode;
};

type ActionItem = {
  title: string;
  subtitle: string;
  icon: ReactNode;
};

type DeliveryRow = {
  id: string;
  user: string;
  menu: string;
  address: string;
  status: "PREPARING" | "SHIPPED" | "DELIVERED";
};

type UserRow = {
  name: string;
  contact: string;
  address: string;
  plan: "Mingguan" | "Bulanan" | "Tahunan";
  serving: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  joined: string;
  nextDelivery: string;
};

type RecipeRow = {
  name: string;
  category: string;
  calories: number;
  protein: number;
  difficulty: "Mudah" | "Sedang" | "Sulit";
  cookTime: string;
  readiness: "OK" | "Needs Review";
};

type WeeklyDayRow = {
  day: string;
  menu: string;
  goal: string;
  calories: number;
  protein: number;
  validation: "Valid" | "Review";
};

type RoleConfig = {
  title: string;
  subtitle: string;
  tabs: TabItem[];
  heroTitle: Record<string, string>;
  heroSubtitle: Record<string, string>;
  kpis: Record<string, KpiItem[]>;
  activities: Record<string, ActivityItem[]>;
  actions: ActionItem[];
  accentStrong: string;
  accentMid: string;
  accentSoft: string;
};

const adminDeliveries: DeliveryRow[] = [
  { id: "DEL-001", user: "John Doe", menu: "Nasi Goreng Kampung", address: "Jakarta Selatan", status: "SHIPPED" },
  { id: "DEL-002", user: "Jane Smith", menu: "Ayam Teriyaki Bowl", address: "Jakarta Pusat", status: "PREPARING" },
  { id: "DEL-003", user: "Bob Wilson", menu: "Spaghetti Carbonara", address: "Tangerang", status: "DELIVERED" },
  { id: "DEL-004", user: "Alice Brown", menu: "Nasi Hainan", address: "Bekasi", status: "SHIPPED" },
  { id: "DEL-005", user: "Charlie Lee", menu: "Beef Bulgogi", address: "Jakarta Barat", status: "PREPARING" },
  { id: "DEL-006", user: "Diana Chen", menu: "Tom Yum Seafood", address: "Jakarta Timur", status: "SHIPPED" },
  { id: "DEL-007", user: "Evan Park", menu: "Rendang Sapi", address: "Depok", status: "DELIVERED" },
  { id: "DEL-008", user: "Fiona Kim", menu: "Pad Thai", address: "Jakarta Selatan", status: "PREPARING" },
];

const adminUsers: UserRow[] = [
  {
    name: "John Doe",
    contact: "john@email.com | +62 812-3456-7890",
    address: "Jl. Sudirman No. 123, Jakarta",
    plan: "Bulanan",
    serving: "2 orang",
    status: "ACTIVE",
    joined: "1 Mar 2026",
    nextDelivery: "6 Mar 2026",
  },
  {
    name: "Jane Smith",
    contact: "jane@email.com | +62 813-9876-5432",
    address: "Jl. Gatot Subroto No. 45, Jakarta",
    plan: "Tahunan",
    serving: "4 orang",
    status: "ACTIVE",
    joined: "15 Feb 2026",
    nextDelivery: "5 Mar 2026",
  },
  {
    name: "Bob Wilson",
    contact: "bob@email.com | +62 815-5555-1234",
    address: "Jl. Thamrin No. 67, Jakarta",
    plan: "Mingguan",
    serving: "1 orang",
    status: "ACTIVE",
    joined: "20 Feb 2026",
    nextDelivery: "4 Mar 2026",
  },
  {
    name: "Alice Brown",
    contact: "alice@email.com | +62 821-2222-3333",
    address: "Jl. Rasuna Said No. 89, Jakarta",
    plan: "Bulanan",
    serving: "2 orang",
    status: "PAUSED",
    joined: "5 Feb 2026",
    nextDelivery: "-",
  },
  {
    name: "Charlie Lee",
    contact: "charlie@email.com | +62 822-4444-5555",
    address: "Jl. Kuningan No. 12, Jakarta",
    plan: "Bulanan",
    serving: "3 orang",
    status: "ACTIVE",
    joined: "10 Jan 2026",
    nextDelivery: "8 Mar 2026",
  },
];

const nutritionRecipes: RecipeRow[] = [
  { name: "Nasi Goreng Kampung", category: "Indonesian", calories: 450, protein: 18, difficulty: "Mudah", cookTime: "25 min", readiness: "OK" },
  { name: "Ayam Teriyaki Bowl", category: "Japanese", calories: 520, protein: 31, difficulty: "Mudah", cookTime: "30 min", readiness: "OK" },
  { name: "Spaghetti Carbonara", category: "Italian", calories: 610, protein: 20, difficulty: "Mudah", cookTime: "20 min", readiness: "Needs Review" },
  { name: "Nasi Hainan", category: "Chinese", calories: 480, protein: 24, difficulty: "Sedang", cookTime: "35 min", readiness: "OK" },
  { name: "Beef Bulgogi", category: "Korean", calories: 550, protein: 34, difficulty: "Sedang", cookTime: "40 min", readiness: "OK" },
  { name: "Tom Yum Seafood", category: "Thai", calories: 320, protein: 26, difficulty: "Sedang", cookTime: "30 min", readiness: "OK" },
  { name: "Rendang Sapi", category: "Indonesian", calories: 680, protein: 28, difficulty: "Sulit", cookTime: "45 min", readiness: "Needs Review" },
  { name: "Pad Thai", category: "Thai", calories: 490, protein: 21, difficulty: "Mudah", cookTime: "25 min", readiness: "OK" },
];

const weeklyNutritionRows: WeeklyDayRow[] = [
  { day: "Senin", menu: "Salmon Teriyaki + Quinoa", goal: "Atlet", calories: 710, protein: 46, validation: "Valid" },
  { day: "Selasa", menu: "Chicken Caesar Light", goal: "Weight Loss", calories: 520, protein: 35, validation: "Valid" },
  { day: "Rabu", menu: "Tempe Power Bowl", goal: "Vegan High Protein", calories: 560, protein: 32, validation: "Valid" },
  { day: "Kamis", menu: "Beef Bulgogi Set", goal: "Atlet", calories: 760, protein: 40, validation: "Review" },
  { day: "Jumat", menu: "Tofu Miso Soup + Rice", goal: "Low Sodium", calories: 430, protein: 23, validation: "Valid" },
  { day: "Sabtu", menu: "Greek Chicken Wrap", goal: "Weight Maintenance", calories: 590, protein: 33, validation: "Valid" },
  { day: "Minggu", menu: "Rendang Lean Plate", goal: "Atlet", calories: 690, protein: 38, validation: "Review" },
];

const adminConfig: RoleConfig = {
  title: "Admin Panel",
  subtitle: "FromFram Operations",
  tabs: [
    { id: "dashboard", label: "Dashboard" },
    { id: "deliveries", label: "Deliveries" },
    { id: "users", label: "Users" },
  ],
  heroTitle: {
    dashboard: "Operational Dashboard",
    deliveries: "Delivery Operations",
    users: "User and Subscription Management",
  },
  heroSubtitle: {
    dashboard: "Pantau data operasional harian dalam satu layar.",
    deliveries: "Kontrol status batch delivery dan monitor flow logistik.",
    users: "Lihat status pelanggan dan dampaknya ke pengiriman berikutnya.",
  },
  kpis: {
    dashboard: [
      { label: "Total Users", value: "1,234", delta: "+12%", icon: <PeopleIcon /> },
      { label: "Active Subscriptions", value: "856", delta: "+8%", icon: <ChartArrowIcon /> },
      { label: "Deliveries Today", value: "342", delta: "89%", icon: <BoxIcon /> },
    ],
    deliveries: [
      { label: "Preparing", value: "3", delta: "Live", icon: <ClockIcon /> },
      { label: "Shipped", value: "3", delta: "Live", icon: <TruckIcon /> },
      { label: "Delivered", value: "2", delta: "Live", icon: <CheckCircleIcon /> },
    ],
    users: [
      { label: "Total Users", value: "8", delta: "Realtime", icon: <PeopleIcon /> },
      { label: "Active", value: "6", delta: "Healthy", icon: <CheckCircleIcon /> },
      { label: "Paused/Cancelled", value: "2", delta: "Needs Action", icon: <AlertIcon /> },
    ],
  },
  activities: {
    dashboard: [
      { text: "User baru mendaftar: john@email.com", time: "10 menit lalu", icon: <PeopleIcon /> },
      { text: "15 subscription akan expired minggu depan", time: "2 jam lalu", icon: <CalendarIcon /> },
      { text: "Delivery batch pagi selesai (342 deliveries)", time: "3 jam lalu", icon: <BoxIcon /> },
    ],
    deliveries: [
      { text: "3 order baru pindah ke PREPARING", time: "6 menit lalu", icon: <ClockIcon /> },
      { text: "Kurir A menandai 2 order SHIPPED", time: "14 menit lalu", icon: <TruckIcon /> },
      { text: "Semua order batch malam sudah DELIVERED", time: "42 menit lalu", icon: <CheckCircleIcon /> },
    ],
    users: [
      { text: "2 user pause subscription untuk 1 minggu", time: "12 menit lalu", icon: <AlertIcon /> },
      { text: "4 user upgrade ke paket tahunan", time: "1 jam lalu", icon: <ChartArrowIcon /> },
      { text: "Admin update data alamat user korporat", time: "2 jam lalu", icon: <MapPinIcon /> },
    ],
  },
  actions: [
    { title: "Kelola Users", subtitle: "Lihat dan update data user", icon: <PeopleIcon /> },
    { title: "Deliveries", subtitle: "Track dan manage delivery", icon: <TruckIcon /> },
    { title: "Reports", subtitle: "Pantau tren operasional", icon: <ChartArrowIcon /> },
  ],
  accentStrong: "#e12533",
  accentMid: "#ff575f",
  accentSoft: "#ffd5d8",
};

const nutritionConfig: RoleConfig = {
  title: "Panel Ahli Gizi",
  subtitle: "FromFram Nutrition Management",
  tabs: [
    { id: "dashboard", label: "Dashboard" },
    { id: "recipes", label: "Recipes" },
    { id: "weekly-menu", label: "Weekly Menu" },
  ],
  heroTitle: {
    dashboard: "Nutrition Control Center",
    recipes: "Recipe Nutrition Validation",
    "weekly-menu": "Weekly Menu Validation by Goal",
  },
  heroSubtitle: {
    dashboard: "Validasi kalori, protein, dan kualitas menu mingguan.",
    recipes: "Periksa detail resep sebelum dipublikasikan ke user.",
    "weekly-menu": "Kelompokkan menu berdasarkan target kesehatan pengguna.",
  },
  kpis: {
    dashboard: [
      { label: "Total Recipes", value: "156", delta: "+8", icon: <BookIcon /> },
      { label: "Weekly Menus", value: "24", delta: "+3", icon: <CalendarIcon /> },
      { label: "Active Users", value: "856", delta: "+12", icon: <PeopleIcon /> },
    ],
    recipes: [
      { label: "Ready", value: "133", delta: "85%", icon: <CheckCircleIcon /> },
      { label: "Need Review", value: "23", delta: "15%", icon: <AlertIcon /> },
      { label: "Protein Focus", value: "47", delta: "+5", icon: <PulseIcon /> },
    ],
    "weekly-menu": [
      { label: "Goal Groups", value: "6", delta: "Active", icon: <TargetIcon /> },
      { label: "Validated Slots", value: "19", delta: "On Track", icon: <CheckCircleIcon /> },
      { label: "Pending Review", value: "5", delta: "Needs Action", icon: <AlertIcon /> },
    ],
  },
  activities: {
    dashboard: [
      { text: "Menu baru ditambahkan: Salmon Teriyaki", time: "1 jam lalu", icon: <BookIcon /> },
      { text: "Resep diupdate: Nasi Goreng Kampung", time: "3 jam lalu", icon: <PulseIcon /> },
      { text: "Weekly menu Week 3 dipublikasikan", time: "5 jam lalu", icon: <CalendarIcon /> },
    ],
    recipes: [
      { text: "2 resep melewati batas sodium harian", time: "8 menit lalu", icon: <AlertIcon /> },
      { text: "6 resep kategori atlet sudah terverifikasi", time: "36 menit lalu", icon: <CheckCircleIcon /> },
      { text: "Audit protein mingguan berhasil", time: "2 jam lalu", icon: <PulseIcon /> },
    ],
    "weekly-menu": [
      { text: "Goal group Atlet mendapatkan 3 menu baru", time: "11 menit lalu", icon: <TargetIcon /> },
      { text: "Review menu Low Sodium dijadwalkan", time: "47 menit lalu", icon: <ClockIcon /> },
      { text: "Notifikasi rekomendasi gizi terkirim", time: "1 jam lalu", icon: <PeopleIcon /> },
    ],
  },
  actions: [
    { title: "Kelola Resep", subtitle: "Validasi AKG dan makronutrien", icon: <BookIcon /> },
    { title: "Jadwal Menu", subtitle: "Atur menu per tujuan kesehatan", icon: <CalendarIcon /> },
    { title: "Rekomendasi", subtitle: "Saran gizi untuk kebutuhan khusus", icon: <PulseIcon /> },
  ],
  accentStrong: "#1d4ed8",
  accentMid: "#4f8df8",
  accentSoft: "#dbeafe",
};

const statusClass: Record<string, string> = {
  PREPARING: styles.tagAmber,
  SHIPPED: styles.tagRed,
  DELIVERED: styles.tagGreen,
  ACTIVE: styles.tagGreen,
  PAUSED: styles.tagAmber,
  CANCELLED: styles.tagRed,
  Mudah: styles.tagBlue,
  Sedang: styles.tagAmber,
  Sulit: styles.tagRed,
  OK: styles.tagGreen,
  "Needs Review": styles.tagRed,
  Valid: styles.tagGreen,
  Review: styles.tagAmber,
};

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export function RolePortalScreen({ role }: { role: RoleVariant }) {
  const config = role === "admin" ? adminConfig : nutritionConfig;
  const [activeTab, setActiveTab] = useState(config.tabs[0].id);

  const themeVars = {
    "--accent-strong": config.accentStrong,
    "--accent-mid": config.accentMid,
    "--accent-soft": config.accentSoft,
  } as CSSProperties;

  const filteredDeliveries = useMemo(() => {
    return adminDeliveries;
  }, []);

  const filteredUsers = useMemo(() => {
    return adminUsers;
  }, []);

  const filteredRecipes = useMemo(() => {
    return nutritionRecipes;
  }, []);

  return (
    <main className={styles.shell} style={themeVars}>
      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>{role === "admin" ? <ShieldIcon /> : <PulseIcon />}</span>
            <div>
              <h1 className={styles.brandTitle}>{config.title}</h1>
              <p className={styles.brandSub}>{config.subtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.logoutButton}>
            Logout
          </button>
        </header>

        <section className={styles.panelCard}>
          <div className={styles.tabList}>
            {config.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={clsx(styles.tabButton, activeTab === tab.id && styles.tabButtonActive)}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.contentWrap}>
            <h2 className={styles.sectionTitle}>{config.heroTitle[activeTab]}</h2>
            <p className={styles.sectionSub}>{config.heroSubtitle[activeTab]}</p>

            <div className={styles.kpiGrid}>
              {config.kpis[activeTab].map((kpi, index) => (
                <article key={kpi.label} className={styles.kpiCard} style={{ animationDelay: `${index * 80}ms` }}>
                  <div className={styles.kpiRow}>
                    <span className={styles.activityIcon}>{kpi.icon}</span>
                    <span className={styles.deltaBadge}>{kpi.delta}</span>
                  </div>
                  <p className={styles.kpiValue}>{kpi.value}</p>
                  <p className={styles.kpiLabel}>{kpi.label}</p>
                </article>
              ))}
            </div>

            {role === "admin" && activeTab === "deliveries" ? (
              <>
                <div className={styles.metricRow}>
                  {[
                    { label: "Preparing", value: "3" },
                    { label: "Shipped", value: "3" },
                    { label: "Delivered", value: "2" },
                    { label: "Total Today", value: "8", hot: true },
                  ].map((metric) => (
                    <article key={metric.label} className={clsx(styles.metric, metric.hot && styles.metricHot)}>
                      <p className={styles.metricLabel}>{metric.label}</p>
                      <p className={styles.metricValue}>{metric.value}</p>
                    </article>
                  ))}
                </div>

                <div className={styles.searchRow}>
                  <input className={styles.input} placeholder="Cari delivery by ID, user, atau menu" />
                  <select className={styles.select} defaultValue="all">
                    <option value="all">Semua status</option>
                    <option value="preparing">Preparing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <select className={styles.select} defaultValue="all">
                    <option value="all">Semua area</option>
                    <option value="jakarta">Jakarta</option>
                    <option value="tangerang">Tangerang</option>
                    <option value="bekasi">Bekasi</option>
                  </select>
                </div>

                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Delivery ID</th>
                        <th>User</th>
                        <th>Menu</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeliveries.map((row) => (
                        <tr key={row.id}>
                          <td className={styles.tableKey}>{row.id}</td>
                          <td>{row.user}</td>
                          <td>{row.menu}</td>
                          <td>{row.address}</td>
                          <td>
                            <span className={clsx(styles.tag, statusClass[row.status])}>{row.status}</span>
                          </td>
                          <td>
                            <button type="button" className={styles.actionCard} style={{ padding: "0.45rem 0.7rem" }}>
                              Advance
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.notice}>
                  <p className={styles.noticeTitle}>Force Advance Status (Demo UI):</p>
                  <ul>
                    <li>PREPARING -&gt; SHIPPED -&gt; DELIVERED</li>
                    <li>Digunakan untuk testing flow logistik massal.</li>
                    <li>Pada production, status idealnya diupdate otomatis dari sistem kurir.</li>
                  </ul>
                </div>
              </>
            ) : null}

            {role === "admin" && activeTab === "users" ? (
              <>
                <div className={styles.searchRow}>
                  <input className={styles.input} placeholder="Cari user by nama atau email" />
                  <select className={styles.select} defaultValue="all">
                    <option value="all">Semua plan</option>
                    <option value="mingguan">Mingguan</option>
                    <option value="bulanan">Bulanan</option>
                    <option value="tahunan">Tahunan</option>
                  </select>
                  <select className={styles.select} defaultValue="all">
                    <option value="all">Semua status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Address</th>
                        <th>Plan</th>
                        <th>Serving</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Next Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.contact}</td>
                          <td>{row.address}</td>
                          <td>
                            <span className={clsx(styles.tag, styles.tagRed)}>{row.plan}</span>
                          </td>
                          <td>{row.serving}</td>
                          <td>
                            <span className={clsx(styles.tag, statusClass[row.status])}>{row.status}</span>
                          </td>
                          <td>{row.joined}</td>
                          <td>{row.nextDelivery}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.notice}>
                  <p className={styles.noticeTitle}>User Management:</p>
                  <ul>
                    <li>Informasi user dan subscription ditampilkan langsung dalam satu tabel.</li>
                    <li>Status otomatis mengikuti lifecycle subscription user.</li>
                    <li>Kolom next delivery membantu tim operasional prioritas jadwal.</li>
                  </ul>
                </div>
              </>
            ) : null}

            {role === "nutritionist" && activeTab === "recipes" ? (
              <>
                <div className={styles.searchRow}>
                  <input className={styles.input} placeholder="Cari recipe, kategori, atau goal" />
                  <select className={styles.select} defaultValue="all">
                    <option value="all">Semua kesulitan</option>
                    <option value="mudah">Mudah</option>
                    <option value="sedang">Sedang</option>
                    <option value="sulit">Sulit</option>
                  </select>
                  <select className={styles.select} defaultValue="all">
                    <option value="all">Semua readiness</option>
                    <option value="ok">OK</option>
                    <option value="review">Needs Review</option>
                  </select>
                </div>

                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Recipe</th>
                        <th>Category</th>
                        <th>Nutrition</th>
                        <th>Difficulty</th>
                        <th>Cook Time</th>
                        <th>Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecipes.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.category}</td>
                          <td>
                            {row.calories} kcal | {row.protein}g protein
                          </td>
                          <td>
                            <span className={clsx(styles.tag, statusClass[row.difficulty])}>{row.difficulty}</span>
                          </td>
                          <td>{row.cookTime}</td>
                          <td>
                            <span className={clsx(styles.tag, statusClass[row.readiness])}>{row.readiness}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {role === "nutritionist" && activeTab === "weekly-menu" ? (
              <>
                <div className={styles.goalRow}>
                  {[
                    "Atlet",
                    "Weight Loss",
                    "Vegan High Protein",
                    "Low Sodium",
                    "Diabetes Friendly",
                    "Weight Maintenance",
                  ].map((goal) => (
                    <span key={goal} className={styles.goalChip}>
                      {goal}
                    </span>
                  ))}
                </div>

                <div className={styles.weekGrid}>
                  {weeklyNutritionRows.map((row) => (
                    <article key={row.day} className={styles.dayCard}>
                      <div className={styles.dayHead}>
                        <p className={styles.dayName}>{row.day}</p>
                        <span className={clsx(styles.tag, statusClass[row.validation])}>{row.validation}</span>
                      </div>
                      <p className={styles.dayMenu}>{row.menu}</p>
                      <div className={styles.dayStats}>
                        <span>{row.goal}</span>
                        <span>{row.calories} kcal</span>
                        <span>{row.protein}g protein</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className={styles.notice}>
                  <p className={styles.noticeTitle}>Nutrition Validation Notes:</p>
                  <ul>
                    <li>Fokus utama: validasi AKG harian berdasarkan segmen pengguna.</li>
                    <li>Menu dengan label Review perlu cek ulang rasio kalori-protein.</li>
                    <li>Grouping menu memungkinkan rekomendasi gizi yang lebih presisi.</li>
                  </ul>
                </div>
              </>
            ) : null}

            {(activeTab === "dashboard") ? (
              <>
                <section className={styles.activityCard}>
                  <h3 className={styles.activityHeader}>Aktivitas Terkini</h3>
                  <ul className={styles.activityList}>
                    {config.activities[activeTab].map((activity) => (
                      <li key={activity.text} className={styles.activityItem}>
                        <span className={styles.activityIcon}>{activity.icon}</span>
                        <div>
                          <p className={styles.activityText}>{activity.text}</p>
                          <p className={styles.activityTime}>{activity.time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className={styles.actionGrid}>
                  {config.actions.map((action) => (
                    <button key={action.title} type="button" className={styles.actionCard}>
                      <span>{action.icon}</span>
                      <p className={styles.actionTitle}>{action.title}</p>
                      <p className={styles.actionSub}>{action.subtitle}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <section className={styles.activityCard}>
                <h3 className={styles.activityHeader}>Aktivitas Terkini</h3>
                <ul className={styles.activityList}>
                  {config.activities[activeTab].map((activity) => (
                    <li key={activity.text} className={styles.activityItem}>
                      <span className={styles.activityIcon}>{activity.icon}</span>
                      <div>
                        <p className={styles.activityText}>{activity.text}</p>
                        <p className={styles.activityTime}>{activity.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a3.5 3.5 0 0 1 7 0M13 20a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m6 14 4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="m3.5 7.5 8.5-4 8.5 4-8.5 4-8.5-4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 7.5V16l8.5 4 8.5-4V7.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 12.2 2.1 2.1 4.9-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 4 3.5 19h17L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4m0 3h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-4 3 8 2-4h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}
