import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionReveal } from "@/components/motion/section-reveal";
import prisma from "@/lib/prisma";
import Image from "next/image";

export const revalidate = 60;

export default async function MenuPage() {
  const recipes = await prisma.recipe.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 12,
  });

  return (
    <main className="flex min-h-screen flex-col bg-[#f8f5ee] text-black">
      <Navbar />
      <div className="flex-grow py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionReveal>
            <SectionHeading
              title="Menu Kami"
              subtitle="Pilihan meal kit sehat untuk Anda yang dibuat oleh ahli gizi kami"
            />
          </SectionReveal>
          
          {recipes.length > 0 ? (
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((meal) => (
                <SectionReveal key={meal.id}>
                  <div className="overflow-hidden rounded-3xl border-2 border-[#1db788]/30 bg-white shadow-sm transition hover:shadow-md h-full flex flex-col">
                    <div className="relative h-48 w-full bg-neutral-200 shrink-0">
                      {meal.imageUrl ? (
                        <Image
                          src={meal.imageUrl}
                          alt={meal.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-400">
                          <span className="text-sm">No image available</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-grow p-6">
                      <h3 className="text-xl font-bold text-black">{meal.name}</h3>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {meal.description}
                      </p>
                      
                      <div className="mt-auto pt-4 flex flex-wrap gap-2">
                        {meal.goalTags?.map((tag, tagIndex) => (
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
          ) : (
            <div className="mt-16 text-center py-12 rounded-3xl border-2 border-dashed border-gray-300">
              <p className="text-gray-500">Belum ada resep yang ditambahkan saat ini.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
