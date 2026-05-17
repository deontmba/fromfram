"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const GOAL_OPTIONS = ["Weight Loss", "Muscle Gain", "Healthy Lifestyle", "Family Nutrition", "Athlete"];
const DIETARY_OPTIONS = ["Halal", "Vegetarian", "No Seafood", "High Protein", "Low Sugar"];
const ALLERGY_OPTIONS = ["Kacang", "Susu", "Seafood", "Gluten", "Telur", "Tidak Ada"];
const COOKING_OPTIONS = ["Quick Cooking", "Beginner Friendly", "Family Portion", "Spicy", "Non Spicy"];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [goals, setGoals] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cookingPrefs, setCookingPrefs] = useState<string[]>([]);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");

  const totalSteps = 5;

  const toggleSelection = (item: string, list: string[], setList: (v: string[]) => void, singleSelect: boolean = false) => {
    if (singleSelect) {
      setList([item]);
      return;
    }
    
    // For allergy: If "Tidak Ada" is selected, clear everything else. If others are selected, clear "Tidak Ada".
    if (list === allergies) {
      if (item === "Tidak Ada") {
        setList(["Tidak Ada"]);
        return;
      } else {
        const filtered = list.filter((a) => a !== "Tidak Ada");
        if (filtered.includes(item)) {
          setList(filtered.filter((a) => a !== item));
        } else {
          setList([...filtered, item]);
        }
        return;
      }
    }

    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await submitData();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const submitData = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/personalization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals,
          dietaryPrefs,
          allergies: allergies.filter(a => a !== "Tidak Ada"),
          cookingPrefs,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          age: age ? parseInt(age, 10) : null,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan data");
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const isNextDisabled = () => {
    if (step === 1 && goals.length === 0) return true;
    if (step === 2 && dietaryPrefs.length === 0) return true;
    if (step === 3 && allergies.length === 0) return true;
    if (step === 5 && cookingPrefs.length === 0) return true;
    return false;
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-neutral-800">Apa tujuan utama kamu?</h2>
              <p className="mt-2 text-neutral-500">Pilih satu yang paling sesuai untuk membantu kami menyusun menu terbaik.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleSelection(goal, goals, setGoals, true)}
                  className={`flex h-14 cursor-pointer items-center justify-between rounded-2xl border-2 px-5 text-left font-semibold transition ${
                    goals.includes(goal) ? "border-[#13b987] bg-[#eafff5] text-[#13b987]" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {goal}
                  {goals.includes(goal) && <CheckIcon />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-neutral-800">Ada preferensi diet tertentu?</h2>
              <p className="mt-2 text-neutral-500">Pilih sebanyak yang kamu mau.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DIETARY_OPTIONS.map((diet) => (
                <button
                  key={diet}
                  onClick={() => toggleSelection(diet, dietaryPrefs, setDietaryPrefs)}
                  className={`flex h-14 cursor-pointer items-center justify-between rounded-2xl border-2 px-5 text-left font-semibold transition ${
                    dietaryPrefs.includes(diet) ? "border-[#13b987] bg-[#eafff5] text-[#13b987]" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {diet}
                  {dietaryPrefs.includes(diet) && <CheckIcon />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-neutral-800">Apakah kamu punya alergi?</h2>
              <p className="mt-2 text-neutral-500">Kami akan menghindari bahan-bahan ini pada menu kamu.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ALLERGY_OPTIONS.map((allergy) => (
                <button
                  key={allergy}
                  onClick={() => toggleSelection(allergy, allergies, setAllergies)}
                  className={`flex h-14 cursor-pointer items-center justify-between rounded-2xl border-2 px-5 text-left font-semibold transition ${
                    allergies.includes(allergy) ? "border-[#13b987] bg-[#eafff5] text-[#13b987]" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {allergy}
                  {allergies.includes(allergy) && <CheckIcon />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-neutral-800">Ceritakan sedikit tentang dirimu</h2>
              <p className="mt-2 text-neutral-500">Opsional, tapi sangat membantu kami untuk rekomendasi porsi & kalori yang tepat.</p>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-neutral-700">Berat Badan (kg)</span>
                <input
                  type="number"
                  placeholder="Misal: 65"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="h-14 w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 text-lg outline-none transition focus:border-[#13b987]"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-neutral-700">Tinggi Badan (cm)</span>
                <input
                  type="number"
                  placeholder="Misal: 170"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="h-14 w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 text-lg outline-none transition focus:border-[#13b987]"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-neutral-700">Umur (tahun)</span>
                <input
                  type="number"
                  placeholder="Misal: 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="h-14 w-full rounded-2xl border-2 border-neutral-200 bg-white px-4 text-lg outline-none transition focus:border-[#13b987]"
                />
              </label>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-neutral-800">Gaya memasak seperti apa yang kamu suka?</h2>
              <p className="mt-2 text-neutral-500">Pilih sebanyak yang kamu mau.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COOKING_OPTIONS.map((cooking) => (
                <button
                  key={cooking}
                  onClick={() => toggleSelection(cooking, cookingPrefs, setCookingPrefs)}
                  className={`flex h-14 cursor-pointer items-center justify-between rounded-2xl border-2 px-5 text-left font-semibold transition ${
                    cookingPrefs.includes(cooking) ? "border-[#13b987] bg-[#eafff5] text-[#13b987]" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {cooking}
                  {cookingPrefs.includes(cooking) && <CheckIcon />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10 border border-neutral-100">
        {/* Progress Bar */}
        <div className="mb-10 space-y-3">
          <div className="flex justify-between text-sm font-bold text-neutral-400">
            <span>Langkah {step} dari {totalSteps}</span>
            <span className="text-[#13b987]">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <motion.div 
              className="h-full bg-[#13b987] rounded-full" 
              initial={{ width: 0 }} 
              animate={{ width: `${(step / totalSteps) * 100}%` }} 
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[360px]">
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm font-bold text-red-500">{error}</p>
        )}

        {/* Footer Navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-neutral-100 pt-6">
          <button
            onClick={handleBack}
            className={`font-bold cursor-pointer transition ${step === 1 ? "invisible" : "text-neutral-400 hover:text-neutral-700"}`}
          >
            Kembali
          </button>
          
          <button
            onClick={handleNext}
            disabled={isNextDisabled() || loading}
            className="flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#13b987] px-8 font-bold text-white shadow-[0_8px_16px_rgba(19,185,135,0.35)] transition hover:bg-[#0f996f] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {loading ? "Menyimpan..." : step === totalSteps ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-[#13b987]">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
