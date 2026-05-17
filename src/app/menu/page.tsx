import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionReveal } from "@/components/motion/section-reveal";

const SAMPLE_MEALS = [
  {
    name: "Salmon Teriyaki Bowl",
    tags: ["High Protein", "Omega 3"],
  },
  {
    name: "Quinoa Salad with Grilled Chicken",
    tags: ["Low Carb", "High Protein"],
  },
  {
    name: "Vegan Buddha Bowl",
    tags: ["Vegan", "High Fiber"],
  },
  {
    name: "Beef Broccoli Stir Fry",
    tags: ["Keto Friendly", "High Iron"],
  },
  {
    name: "Grilled Mahi-Mahi Tacos",
    tags: ["Pescatarian", "Fresh"],
  },
  {
    name: "Mediterranean Chickpea Wrap",
    tags: ["Vegetarian", "Healthy Fats"],
  },
];

export default function MenuPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f8f5ee] text-black">
      <Navbar />
      <div className="flex-grow py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionReveal>
            <SectionHeading
              title="Menu Kami"
              subtitle="Pilihan meal kit sehat untuk Anda"
            />
          </SectionReveal>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_MEALS.map((meal, index) => (
              <SectionReveal key={index}>
                <div className="overflow-hidden rounded-3xl border-2 border-[#1db788]/30 bg-white shadow-sm transition hover:shadow-md">
                  <div className="h-48 w-full bg-neutral-200"></div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-black">{meal.name}</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {meal.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="rounded-full bg-[#13b987]/10 px-3 py-1 text-xs font-semibold text-[#13b987]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
