"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import {
  profileMockData,
  healthMockData,
  addressMockData,
  type ProfileDetails,
  type Address
} from "@/components/profile/mock-data";
import { 
  ArrowLeft, Edit2, LogOut, User, MapPin, 
  Settings, ChevronRight, Activity, 
  Flame, CreditCard, Shield, Bell, Zap, Sparkles, Star, Package, Plus
} from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

type ProfileResponse = {
  user?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    createdAt?: string;
    gender?: string;
    personalization?: {
      age?: number;
      goals?: string[];
      dietaryPrefs?: string[];
      allergies?: string[];
    };
    subscriptions?: any[];
    addresses?: any[];
  };
  data?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    createdAt?: string;
    gender?: string;
    personalization?: {
      age?: number;
      goals?: string[];
      dietaryPrefs?: string[];
      allergies?: string[];
    };
    subscriptions?: any[];
    addresses?: any[];
  };
  error?: string;
  message?: string;
};

type StatusMessage =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

const inputClassName =
  "mt-2 h-14 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-[1.02rem] text-neutral-700 outline-none transition focus:border-[#13b987] focus:ring-2 focus:ring-[#13b987]/20";
const cardClassName = "rounded-[24px] border border-black/[0.03] bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)]";

type SubscriptionInfo = {
  status: string;
  planType: string;
  servings: number;
  startDate: string | null;
  goalName: string | null;
};

function formatPlanLabel(planType: string) {
  switch (planType?.toUpperCase()) {
    case "MINGGUAN": return "Mingguan";
    case "BULANAN": return "Bulanan";
    case "TAHUNAN": return "Tahunan";
    default: return planType ?? "—";
  }
}

function getNextBillingDate(startDate: string | null, planType: string) {
  if (!startDate) return "Belum tersedia";
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return "Belum tersedia";
  switch (planType?.toUpperCase()) {
    case "MINGGUAN": date.setDate(date.getDate() + 7); break;
    case "BULANAN": date.setMonth(date.getMonth() + 1); break;
    case "TAHUNAN": date.setFullYear(date.getFullYear() + 1); break;
    default: date.setDate(date.getDate() + 7);
  }
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function ProfileOverviewScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetails>(profileMockData);
  const [draft, setDraft] = useState<ProfileDetails>(profileMockData);
  const [addresses, setAddresses] = useState<Address[]>([]); // Initialize empty to avoid static Jl Sudirman
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as ProfileResponse | null;
        const user = data?.user ?? data?.data;

        if (!response.ok || !isMounted || !user) {
          return;
        }

        // Load address dari data profile (jika ada)
        if (Array.isArray(user.addresses)) {
          setAddresses(user.addresses);
        } else {
          setAddresses([]);
        }

        // Extract subscription info
        const subs = user.subscriptions ?? [];
        const activeSub = subs.find((s: any) => s.status === "ACTIVE");
        const unpaidSub = subs.find((s: any) => s.status === "UNPAID");
        const currentSub = activeSub ?? unpaidSub ?? null;

        if (currentSub) {
          setSubscriptionInfo({
            status: currentSub.status ?? "UNKNOWN",
            planType: currentSub.planType ?? "MINGGUAN",
            servings: currentSub.servings ?? 2,
            startDate: currentSub.startDate ?? null,
            goalName: currentSub.goal?.name ?? null,
          });
        }

        const isActiveSubscription = !!activeSub;

        const mappedProfile = {
          fullName: user.name ?? profileMockData.fullName,
          email: user.email ?? profileMockData.email,
          phoneNumber: user.phoneNumber ?? profileMockData.phoneNumber,
          avatarUrl: user.avatarUrl ?? profileMockData.avatarUrl,
          memberLabel: isActiveSubscription ? "Premium Member" : "Reguler",
          joinedAt: user.createdAt
            ? `Joined ${new Intl.DateTimeFormat("en", {
                month: "short",
                year: "numeric",
              }).format(new Date(user.createdAt))}`
            : profileMockData.joinedAt,
          gender: user.gender ?? profileMockData.gender,
          age: user.personalization?.age?.toString() ?? profileMockData.age,
          isSubscribed: isActiveSubscription,
          goals: user.personalization?.goals?.join(", ") ?? healthMockData.goals,
          allergies: user.personalization?.allergies?.join(", ") ?? healthMockData.allergies,
          dietPreference: user.personalization?.dietaryPrefs?.join(", ") ?? healthMockData.dietPreference,
        };

        setProfile(mappedProfile);
        setDraft(mappedProfile);
      } catch {
        // Fallback ke data lokal jika request profil gagal.
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const openEditDialog = () => {
    setDraft(profile);
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditOpen(false);
  };

  const handleAvatarChange = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const avatarUrl = reader.result as string;
          try {
            const response = await fetch("/api/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ avatarUrl }),
            });
            
            if (response.ok) {
              setProfile(prev => ({ ...prev, avatarUrl }));
              setDraft(prev => ({ ...prev, avatarUrl }));
              setMessage({ tone: "success", text: "Avatar berhasil diperbarui." });
            } else {
              const data = await response.json().catch(() => null);
              setMessage({ tone: "error", text: data?.error ?? data?.message ?? "Gagal mengunggah avatar." });
            }
          } catch {
            setMessage({ tone: "error", text: "Terjadi kesalahan koneksi saat mengunggah avatar." });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaveConfirmOpen(false);
    setIsSaving(true);
    setMessage(null);

    const nextProfile = {
      ...profile,
      fullName: draft.fullName.trim() || profile.fullName,
      email: draft.email.trim() || profile.email,
      phoneNumber: draft.phoneNumber.trim() || profile.phoneNumber,
      gender: draft.gender.trim() || profile.gender,
      age: draft.age.trim() || profile.age,
      avatarUrl: draft.avatarUrl || profile.avatarUrl,
    };

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.fullName,
          email: draft.email,
          phoneNumber: draft.phoneNumber,
          gender: draft.gender,
          age: draft.age ? Number.parseInt(draft.age) : undefined,
          avatarUrl: draft.avatarUrl,
        }),
      });
      const data = (await response.json().catch(() => null)) as ProfileResponse | null;
      const user = data?.user ?? data?.data;

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? data?.message ?? "Gagal menyimpan profile.",
        });
        return;
      }

      const updatedProfile = {
        ...nextProfile,
        fullName: user?.name ?? draft.fullName,
        email: user?.email ?? draft.email,
        phoneNumber: user?.phoneNumber ?? draft.phoneNumber,
        avatarUrl: user?.avatarUrl ?? draft.avatarUrl,
        age: user?.personalization?.age?.toString() ?? draft.age,
      };
      setProfile(updatedProfile);
      setDraft(updatedProfile);
      setMessage({
        tone: "success",
        text: "Profile berhasil diperbarui.",
      });
      setIsEditOpen(false);
    } catch {
      setProfile(nextProfile);
      setDraft(nextProfile);
      setMessage({
        tone: "success",
        text: "Perubahan disimpan sementara (Backend tidak terhubung).",
      });
      setIsEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
    }
  };

  const parseArrayData = (dataStr: string) => {
    if (!dataStr) return [];
    return dataStr.split(',').map(item => item.trim()).filter(Boolean);
  };

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[#fafafb] px-4 py-8 sm:px-6 sm:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#d6f2e5_0%,transparent_60%)] opacity-40"
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative mx-auto w-full max-w-[960px]"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-neutral-100 text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-[1.35rem] font-bold text-neutral-900 tracking-tight">Profile Management</h1>
            <div className="h-12 w-12"></div> {/* Spacer for center alignment */}
          </motion.div>

          {message ? (
            <motion.div variants={itemVariants} className="mb-6">
              <div className={`rounded-2xl p-4 text-sm font-semibold text-center border ${message.tone === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-[#eafff5] text-[#13b987] border-[#13b987]/20"}`}>
                {message.text}
              </div>
            </motion.div>
          ) : null}

          {/* Profile Hero */}
          <motion.div variants={itemVariants} className="relative rounded-[32px] overflow-hidden bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-8 border border-black/[0.02]">
            <div className="absolute top-0 left-0 right-0 h-36 bg-[linear-gradient(135deg,#eafff5_0%,#d6f2e5_100%)] opacity-80" />
            <div className="relative flex flex-col items-center text-center mt-8">
              <div className="relative">
                <div className="h-[120px] w-[120px] rounded-[28px] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] rotate-3 hover:rotate-0 transition-transform duration-300 overflow-hidden relative">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.fullName} className="h-full w-full rounded-[20px] object-cover" />
                  ) : (
                    <div className="h-full w-full rounded-[20px] bg-[linear-gradient(135deg,#13b987_0%,#0f996f_100%)] flex items-center justify-center text-4xl font-bold text-white shadow-inner">
                      {getInitials(profile.fullName)}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleAvatarChange}
                  className="absolute -bottom-2 -right-2 h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-neutral-100 text-neutral-600 hover:text-[#13b987] hover:scale-105 transition"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              
              <h2 className="mt-6 text-[2.2rem] font-bold tracking-tight text-neutral-900">
                {profile.fullName}
              </h2>
              <p className="text-[1.05rem] text-neutral-500 mt-1 font-medium">{profile.email}</p>
              
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[0.9rem] font-bold shadow-sm border ${profile.isSubscribed ? "bg-[#13b987]/10 text-[#13b987] border-[#13b987]/20" : "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
                  <Star size={16} className={profile.isSubscribed ? "fill-[#13b987]" : ""} />
                  {profile.isSubscribed ? "Premium Member" : "Belum Langganan"}
                </div>
              </div>
              
              {profile.isSubscribed ? (
                <div className="mt-10 flex w-full max-w-[480px] justify-between divide-x divide-neutral-100 border-t border-neutral-100 pt-8">
                  <div className="flex-1 text-center">
                    <p className="text-[1.7rem] font-bold text-neutral-900">24</p>
                    <p className="text-[0.85rem] font-bold text-neutral-400 uppercase tracking-widest mt-1">Boxes</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[1.7rem] font-bold text-[#13b987]">12</p>
                    <p className="text-[0.85rem] font-bold text-[#13b987]/60 uppercase tracking-widest mt-1">Favs</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[1.7rem] font-bold text-neutral-900">6<span className="text-xl text-neutral-400">mo</span></p>
                    <p className="text-[0.85rem] font-bold text-neutral-400 uppercase tracking-widest mt-1">Streak</p>
                  </div>
                </div>
              ) : (
                <div className="mt-10 pt-6 border-t border-neutral-100 w-full max-w-[400px]">
                  <p className="text-sm text-neutral-500 font-medium">Mulai langganan untuk mendapatkan akses fitur penuh dan rekomendasi personal AI.</p>
                </div>
              )}
            </div>
          </motion.div>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="space-y-8">
              {/* Personal Information */}
              <motion.div variants={itemVariants} className={cardClassName}>
                <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-[18px] bg-neutral-100 flex items-center justify-center text-neutral-600 shadow-sm border border-neutral-200/50">
                      <User size={22} />
                    </div>
                    <h3 className="text-[1.3rem] font-bold text-neutral-900 tracking-tight">Personal Info</h3>
                  </div>
                  <button className="text-[0.95rem] font-bold text-[#13b987] hover:bg-[#eafff5] px-4 py-2 rounded-xl transition" onClick={openEditDialog}>Edit</button>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center py-3.5 border-b border-neutral-100/80">
                    <span className="text-neutral-500 font-medium">Full Name</span>
                    <span className="font-bold text-neutral-900">{profile.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center py-3.5 border-b border-neutral-100/80">
                    <span className="text-neutral-500 font-medium">Gender</span>
                    <span className={`font-bold ${profile.gender ? 'text-neutral-900' : 'text-neutral-400 italic'}`}>
                      {profile.gender || "Belum diisi"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3.5 border-b border-neutral-100/80">
                    <span className="text-neutral-500 font-medium">Age</span>
                    <span className={`font-bold ${profile.age ? 'text-neutral-900' : 'text-neutral-400 italic'}`}>
                      {profile.age ? `${profile.age} Years` : "Belum diisi"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3.5">
                    <span className="text-neutral-500 font-medium">Phone</span>
                    <span className={`font-bold ${profile.phoneNumber ? 'text-neutral-900' : 'text-neutral-400 italic'}`}>
                      {profile.phoneNumber || "Belum diisi"}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* AI Personalization Settings */}
              <motion.div variants={itemVariants} className={cardClassName + " relative overflow-hidden"}>
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#13b987]/10 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 mb-7 relative">
                  <div className="h-12 w-12 rounded-[18px] bg-[linear-gradient(135deg,#13b987_0%,#0f996f_100%)] flex items-center justify-center text-white shadow-[0_8px_16px_rgba(19,185,135,0.3)]">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-[1.3rem] font-bold text-neutral-900 tracking-tight">AI Personalization</h3>
                    <div className="inline-flex items-center gap-1.5 mt-1">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#13b987] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#13b987]"></span>
                      </span>
                      <p className="text-[0.8rem] text-[#13b987] font-bold uppercase tracking-wider">Active</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[20px] bg-[#fafafa] p-5 border border-neutral-100 mb-5 shadow-inner">
                  <p className="text-[0.95rem] text-neutral-600 leading-relaxed font-medium">
                    FromFram AI is currently tailoring your weekly meal plan to support <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-lg shadow-sm">{(profile as any).goals || healthMockData.goals}</span> while avoiding <span className="font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-lg shadow-sm">{(profile as any).allergies || healthMockData.allergies || "Nothing"}</span>.
                  </p>
                </div>
                <div className="flex items-center justify-between py-3.5 border-b border-neutral-100/80">
                  <span className="text-[1rem] font-bold text-neutral-800">Auto-adjust portions</span>
                  <div className="h-7 w-12 rounded-full bg-[#13b987] relative cursor-pointer shadow-inner">
                    <div className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-[1rem] font-bold text-neutral-800">Discover new cuisines</span>
                  <div className="h-7 w-12 rounded-full bg-[#13b987] relative cursor-pointer shadow-inner">
                    <div className="absolute right-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
                  </div>
                </div>
              </motion.div>

              {/* Address Management */}
              <motion.div variants={itemVariants} className={cardClassName}>
                <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-[18px] bg-neutral-100 flex items-center justify-center text-neutral-600 shadow-sm border border-neutral-200/50">
                      <MapPin size={22} />
                    </div>
                    <h3 className="text-[1.3rem] font-bold text-neutral-900 tracking-tight">Addresses</h3>
                  </div>
                  <Link href="/profile/address" className="text-[0.95rem] font-bold text-[#13b987] hover:bg-[#eafff5] px-4 py-2 rounded-xl transition">Manage</Link>
                </div>
                <div className="space-y-4">
                  {addresses.length > 0 ? (
                    addresses.map((address) => (
                      <div key={address.id} className={`rounded-[20px] p-5 relative transition cursor-pointer ${address.isDefault ? "border-2 border-[#13b987]/30 bg-[#eafff5]/40 hover:border-[#13b987]/60" : "border border-neutral-100 bg-[#fafafa] hover:bg-white hover:border-neutral-200 hover:shadow-sm"}`}>
                        {address.isDefault && (
                          <div className="absolute top-5 right-5">
                            <span className="text-[0.75rem] font-extrabold text-[#13b987] bg-[#13b987]/15 px-2.5 py-1 rounded-lg uppercase tracking-wider">Primary</span>
                          </div>
                        )}
                        <p className="font-bold text-neutral-900 text-[1.1rem] mb-1">{address.label}</p>
                        <p className="text-[0.95rem] font-medium text-neutral-600 leading-relaxed max-w-[85%]">{address.street}, {address.city}, {address.postalCode}</p>
                        {address.notes && (
                          <p className="text-[0.85rem] font-bold text-[#13b987]/80 mt-3 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#13b987]"></span> Note: {address.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-neutral-300 bg-[#fafafa] p-6 text-center">
                      <p className="text-[0.95rem] font-medium text-neutral-500 mb-3">Belum ada alamat tersimpan</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="space-y-8">
              {/* Health & Nutrition Profile */}
              <motion.div variants={itemVariants} className={cardClassName}>
                <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-[18px] bg-[#fff0f2] flex items-center justify-center text-[#e11d48] shadow-sm border border-[#ffe4e8]">
                      <Activity size={22} />
                    </div>
                    <h3 className="text-[1.3rem] font-bold text-neutral-900 tracking-tight">Health Profile</h3>
                  </div>
                  <Link href="/profile/health" className="text-[0.95rem] font-bold text-[#13b987] hover:bg-[#eafff5] px-4 py-2 rounded-xl transition">Update</Link>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-7">
                  <div className="rounded-[20px] bg-[#fafafa] p-5 border border-neutral-100 transition hover:shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-orange-100 rounded-lg text-orange-500">
                        <Flame size={16} />
                      </div>
                      <span className="text-[0.85rem] font-bold text-neutral-500 uppercase tracking-wide">Target</span>
                    </div>
                    <p className="font-black text-neutral-900 text-2xl">1,800 <span className="text-[1rem] font-semibold text-neutral-400">kcal</span></p>
                  </div>
                  <div className="rounded-[20px] bg-[#fafafa] p-5 border border-neutral-100 transition hover:shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-[#eafff5] rounded-lg text-[#13b987]">
                        <Zap size={16} />
                      </div>
                      <span className="text-[0.85rem] font-bold text-neutral-500 uppercase tracking-wide">Goal</span>
                    </div>
                    <p className="font-black text-neutral-900 text-[1.1rem] truncate">{(profile as any).goals || healthMockData.goals || "Not set"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[0.9rem] font-bold text-neutral-400 uppercase tracking-wider mb-3">Dietary Preference</p>
                    <div className="flex flex-wrap gap-2.5">
                      {(profile as any).dietPreference ? (
                        <span className="inline-flex items-center px-4 py-2 rounded-xl bg-[#13b987]/10 text-[#13b987] text-[0.95rem] font-bold border border-[#13b987]/20 shadow-sm">{(profile as any).dietPreference}</span>
                      ) : (
                        <span className="text-sm font-medium text-neutral-400 italic">Belum diisi</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.9rem] font-bold text-neutral-400 uppercase tracking-wider mb-3">Allergies & Dislikes</p>
                    <div className="flex flex-wrap gap-2.5">
                      {(profile as any).allergies ? parseArrayData((profile as any).allergies).map((allergy, idx) => (
                        <span key={idx} className="inline-flex items-center px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[0.95rem] font-bold border border-red-100 shadow-sm">{allergy}</span>
                      )) : (
                         <span className="text-sm font-medium text-neutral-400 italic">Tidak ada alergi tercatat</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Subscription Management */}
              <motion.div variants={itemVariants} className={cardClassName}>
                <Link href="/subscription" className="block cursor-pointer">
                  <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-[18px] bg-[#fefce8] flex items-center justify-center text-yellow-500 shadow-sm border border-[#fef08a]/50">
                      <CreditCard size={22} />
                    </div>
                    <h3 className="text-[1.3rem] font-bold text-neutral-900 tracking-tight">Subscription</h3>
                  </div>
                </div>
                
                {profile.isSubscribed && subscriptionInfo ? (
                  <div className="rounded-[24px] bg-[linear-gradient(135deg,#1f2937_0%,#111827_100%)] p-7 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute -right-8 -bottom-8 opacity-5 transform rotate-12">
                      <Package size={160} />
                    </div>
                    <div className="relative">
                      <div className="inline-flex rounded-xl bg-white/20 px-3 py-1.5 text-[0.75rem] font-extrabold tracking-widest backdrop-blur-md text-white shadow-sm border border-white/10 uppercase">
                        Active Plan
                      </div>
                      <h4 className="mt-5 text-[1.8rem] font-bold tracking-tight">{formatPlanLabel(subscriptionInfo.planType)} Plan</h4>
                      <p className="mt-1.5 text-neutral-300 text-[1rem] font-medium">{subscriptionInfo.servings} Porsi • Free Delivery</p>
                      
                      <div className="mt-8 flex items-end justify-between bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                        <div>
                          <p className="text-[0.8rem] text-neutral-400 font-bold uppercase tracking-wider">Next billing date</p>
                          <p className="text-[1.1rem] font-bold mt-1 text-white">{getNextBillingDate(subscriptionInfo.startDate, subscriptionInfo.planType)}</p>
                        </div>
                        <button className="rounded-xl bg-white text-neutral-900 px-5 py-2.5 text-[0.95rem] font-bold hover:bg-neutral-100 transition shadow-md hover:scale-105">
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ) : subscriptionInfo?.status === "UNPAID" ? (
                  <div className="rounded-[24px] border-2 border-orange-200 bg-orange-50 p-7 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-4">
                      <CreditCard size={32} />
                    </div>
                    <h4 className="text-[1.2rem] font-bold text-neutral-900">Menunggu Pembayaran</h4>
                    <p className="text-[0.95rem] text-neutral-500 mt-2">Plan {formatPlanLabel(subscriptionInfo.planType)} • {subscriptionInfo.servings} Porsi</p>
                    <p className="text-[0.88rem] text-orange-600 font-medium mt-2 mb-6">Selesaikan pembayaran untuk mengaktifkan langganan Anda.</p>
                    <button className="w-full rounded-2xl bg-orange-500 text-white px-5 py-3.5 text-[1rem] font-bold hover:bg-orange-600 transition shadow-[0_8px_16px_rgba(249,115,22,0.25)] hover:-translate-y-0.5">
                      Selesaikan Pembayaran
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-neutral-200 bg-[#fafafa] p-7 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                      <Package size={32} />
                    </div>
                    <h4 className="text-[1.2rem] font-bold text-neutral-900">Anda belum berlangganan</h4>
                    <p className="text-[0.95rem] text-neutral-500 mt-2 mb-6">Pilih paket langganan untuk mendapatkan makanan sehat diantar setiap hari.</p>
                    <button className="w-full rounded-2xl bg-[#13b987] text-white px-5 py-3.5 text-[1rem] font-bold hover:bg-[#0f996f] transition shadow-[0_8px_16px_rgba(19,185,135,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(19,185,135,0.35)]">
                      Lihat Paket Langganan
                    </button>
                  </div>
                )}
                </Link>
              </motion.div>

              {/* Account & Security */}
              <motion.div variants={itemVariants} className={cardClassName}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-[18px] bg-neutral-100 flex items-center justify-center text-neutral-600 shadow-sm border border-neutral-200/50">
                      <Shield size={22} />
                    </div>
                    <h3 className="text-[1.3rem] font-bold text-neutral-900 tracking-tight">Account</h3>
                  </div>
                </div>

                <div className="space-y-1">
                  <Link href="/profile/security" className="flex items-center justify-between p-4 hover:bg-[#fafafa] rounded-[20px] transition group border border-transparent hover:border-neutral-100">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-[16px] bg-white border border-neutral-100 flex items-center justify-center text-neutral-500 shadow-sm group-hover:text-[#13b987] transition-colors">
                        <Settings size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 text-[1.05rem]">Password & Security</p>
                        <p className="text-[0.9rem] font-medium text-neutral-500 mt-0.5">Change password, 2FA</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-neutral-400 group-hover:text-[#13b987] group-hover:translate-x-1 transition-all" />
                  </Link>
                  
                  <Link href="/profile/notifications" className="flex items-center justify-between p-4 hover:bg-[#fafafa] rounded-[20px] transition group border border-transparent hover:border-neutral-100">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-[16px] bg-white border border-neutral-100 flex items-center justify-center text-neutral-500 shadow-sm group-hover:text-[#13b987] transition-colors">
                        <Bell size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 text-[1.05rem]">Notifications</p>
                        <p className="text-[0.9rem] font-medium text-neutral-500 mt-0.5">Push, email, SMS alerts</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-neutral-400 group-hover:text-[#13b987] group-hover:translate-x-1 transition-all" />
                  </Link>

                  <div className="pt-3 mt-3 border-t border-neutral-100">
                    <button 
                      onClick={() => setIsLogoutConfirmOpen(true)} 
                      disabled={isLoggingOut}
                      className="w-full mt-2 flex items-center justify-center gap-2.5 p-4 text-[#e11d48] font-bold hover:bg-[#fff0f2] rounded-[20px] transition border border-transparent hover:border-[#ffe4e8] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <LogOut size={20} />
                      {isLoggingOut ? "Logging out..." : "Log out"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Edit Dialog Modal */}
      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[480px] rounded-[32px] border border-black/5 bg-white p-8 shadow-[0_24px_48px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.85rem] font-bold text-[#13b987] uppercase tracking-wider">Profile</p>
                <h3 className="mt-1 text-[1.6rem] font-bold tracking-tight text-neutral-900">
                  Edit details
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEditDialog}
                className="rounded-full h-10 w-10 flex items-center justify-center bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200"
              >
                ✕
              </button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSave}>
              <label className="block">
                <span className="block text-[1.05rem] font-bold text-neutral-800">
                  Full name
                </span>
                <input
                  className={inputClassName}
                  required
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      fullName: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block">
                <span className="block text-[1.05rem] font-bold text-neutral-800">Email</span>
                <input
                  type="email"
                  className={inputClassName}
                  required
                  readOnly
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-[1.05rem] font-bold text-neutral-800">Gender</span>
                  <select
                    className={inputClassName + " appearance-none"}
                    required
                    value={draft.gender || ""}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        gender: event.target.value,
                      }))
                    }
                  >
                    <option value="" disabled>Pilih Gender</option>
                    <option value="Male">Laki-laki</option>
                    <option value="Female">Perempuan</option>
                  </select>
                </label>
                
                <label className="block">
                  <span className="block text-[1.05rem] font-bold text-neutral-800">Age</span>
                  <input
                    type="number"
                    className={inputClassName}
                    placeholder="Contoh: 25"
                    required
                    min="1"
                    value={draft.age || ""}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        age: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-[1.05rem] font-bold text-neutral-800">Phone number</span>
                <input
                  type="tel"
                  className={inputClassName}
                  placeholder="Contoh: 08123456789"
                  required
                  pattern="^[0-9+]{9,15}$"
                  title="Nomor telepon harus berisi 9-15 digit angka (tanda + diperbolehkan di awal)"
                  value={draft.phoneNumber || ""}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-6 h-14 w-full rounded-2xl bg-[#13b987] text-[1.1rem] font-bold text-white shadow-[0_8px_20px_rgba(19,185,135,0.35)] transition hover:bg-[#0f996f] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-[0_8px_25px_rgba(19,185,135,0.45)] hover:-translate-y-0.5"
              >
                {isSaving ? "Saving changes..." : "Save changes"}
              </button>
            </form>
          </motion.div>
        </div>
      ) : null}
      
      <ConfirmDialog
        isOpen={isSaveConfirmOpen}
        title="Confirm Profile Changes"
        message="Are you sure you want to save the changes to your profile data?"
        confirmLabel="Yes, Save"
        cancelLabel="Cancel"
        isConfirming={isSaving}
        onCancel={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Yes, Log out"
        cancelLabel="Cancel"
        variant="destructive"
        isConfirming={isLoggingOut}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "FF";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

