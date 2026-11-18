"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";

const GOAL_OPTIONS = ["Turun Berat Badan", "Tambah Massa Otot", "Hidup Sehat", "Nutrisi Keluarga", "Atlet"];
const DIETARY_OPTIONS = ["Halal", "Vegetarian", "Tanpa Seafood", "Tinggi Protein", "Rendah Gula"];
const ALLERGY_OPTIONS = ["Kacang", "Susu", "Seafood", "Gluten", "Telur", "Tidak Ada"];
const COOKING_OPTIONS = ["Masak Cepat", "Ramah Pemula", "Porsi Keluarga", "Pedas", "Tidak Pedas"];

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

  const choiceSteps: Record<number, { title: string; hint: string; options: string[]; value: string[]; set: (v: string[]) => void; single?: boolean }> = {
    1: { title: "Apa tujuan utama kamu?", hint: "Pilih satu. Kami pakai untuk merekomendasikan paket.", options: GOAL_OPTIONS, value: goals, set: setGoals, single: true },
    2: { title: "Ada preferensi makan?", hint: "Boleh pilih lebih dari satu.", options: DIETARY_OPTIONS, value: dietaryPrefs, set: setDietaryPrefs },
    3: { title: "Punya alergi makanan?", hint: "Boleh pilih lebih dari satu, atau pilih Tidak Ada.", options: ALLERGY_OPTIONS, value: allergies, set: setAllergies },
    5: { title: "Gaya masak yang kamu suka?", hint: "Boleh pilih lebih dari satu.", options: COOKING_OPTIONS, value: cookingPrefs, set: setCookingPrefs },
  };

  const renderStepContent = () => {
    const choice = choiceSteps[step];
    if (choice) {
      return (
        <motion.div key={`step${step}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-neutral-900">{choice.title}</h1>
          <p className="mt-2 text-[0.95rem] text-neutral-500">{choice.hint}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2" role={choice.single ? "radiogroup" : "group"}>
            {choice.options.map((option) => {
              const selected = choice.value.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  role={choice.single ? "radio" : "checkbox"}
                  aria-checked={selected}
                  onClick={() => toggleSelection(option, choice.value, choice.set, choice.single)}
                  className={`flex h-12 items-center justify-between rounded-xl border px-4 text-left text-[0.95rem] font-medium transition ${
                    selected
                      ? "border-[#13b987] bg-[#effaf5] text-[#07845e]"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {option}
                  {selected ? <Check aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} /> : null}
                </button>
              );
            })}
          </div>
        </motion.div>
      );
    }

    // Step 4: body stats (optional)
    const fields: Array<[string, string, string, (v: string) => void, string]> = [
      ["Berat badan", "kg", weight, setWeight, "65"],
      ["Tinggi badan", "cm", height, setHeight, "170"],
      ["Umur", "tahun", age, setAge, "25"],
    ];
    return (
      <motion.div key="step4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-neutral-900">Sedikit tentang kamu</h1>
        <p className="mt-2 text-[0.95rem] text-neutral-500">Opsional. Membantu kami menyarankan porsi dan kalori yang pas.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {fields.map(([label, unit, value, setValue, placeholder]) => (
            <label key={label} className="block space-y-1.5">
              <span className="block text-sm font-medium text-neutral-700">{label}</span>
              <span className="flex h-11 items-center rounded-xl border border-neutral-300 bg-white px-3.5 focus-within:border-[#13b987] focus-within:ring-2 focus-within:ring-[#13b987]/20">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-transparent text-[0.95rem] text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                <span className="ml-2 text-sm text-neutral-400">{unit}</span>
              </span>
            </label>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <BrandMark />
        <span className="text-sm text-neutral-500">
          Langkah {step} dari {totalSteps}
        </span>
      </header>
      <div className="h-1 w-full bg-neutral-100">
        <motion.div
          className="h-full bg-[#13b987]"
          initial={false}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10 sm:py-16">
        <div className="flex-1">
          <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className={`h-11 rounded-xl px-4 text-[0.95rem] font-medium text-neutral-600 transition hover:bg-neutral-100 ${step === 1 ? "invisible" : ""}`}
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isNextDisabled() || loading}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#13b987] px-8 text-[0.95rem] font-semibold text-white transition hover:bg-[#0f996f] disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {loading ? "Menyimpan..." : step === totalSteps ? "Selesai" : step === 4 && !weight && !height && !age ? "Lewati" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}
