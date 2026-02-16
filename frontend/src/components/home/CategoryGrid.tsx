"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Heart,
  Shirt,
  Home as HomeIcon,
  Monitor,
  Baby,
  Dumbbell,
  Hammer,
  PawPrint,
  Car,
  UtensilsCrossed,
  Briefcase,
  Recycle,
  Flame,
} from "lucide-react";
import type { Category } from "@/types/category";

const categoryIcons = [
  { name: "Skönhet & Hälsa", icon: Heart },
  { name: "Kläder & Accessoarer", icon: Shirt },
  { name: "Hem & Hushåll", icon: HomeIcon },
  { name: "Teknik & Datorer", icon: Monitor },
  { name: "Barn & Familj", icon: Baby },
  { name: "Sport & Fritid", icon: Dumbbell },
  { name: "Bygg & Trädgård", icon: Hammer },
  { name: "Husdjur", icon: PawPrint },
  { name: "Fordon & Tillbehör", icon: Car },
  { name: "Mat & Dryck", icon: UtensilsCrossed },
  { name: "Kontor & Företag", icon: Briefcase },
  { name: "Begagnade produkter", icon: Recycle },
];

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const router = useRouter();

  const rootCategories = categories.filter((c) => c.parent_id === null);
  const getSubCategories = (parentId: number) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="px-3 py-4 md:p-8 max-w-[1600px] mx-auto">
      <section>
        <div className="flex items-center justify-between mb-4 md:mb-8">
           <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
            Utforska kategorier
          </h2>
        </div>
       
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4">
          {/* 1. KAMPANJER */}
          <motion.div
            whileHover={{ y: -5 }}
            className="group relative p-3 md:p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-300 cursor-pointer flex flex-row items-center gap-3 md:gap-4 h-20 md:h-24 hover:z-50"
             onClick={() => router.push(`/deals`)}
          >
             <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                <Flame className="w-5 h-5 md:w-6 md:h-6 text-red-500 transition-transform duration-300 group-hover:scale-110" />
             </div>
            <span className="text-xs md:text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors text-left">
              Kampanjer
            </span>
          </motion.div>

          {/* 2. HUVUDKATEGORIER */}
          {rootCategories.map((root) => {
            const subs = getSubCategories(root.id);
            const isComingSoon = root.coming_soon;
            const Icon = categoryIcons.find(
              (ci) => ci.name === root.name,
            )?.icon;

            return (
              <motion.div
                key={root.id}
                 whileHover={!isComingSoon ? { y: -5 } : {}}
                className={`relative group p-3 md:p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-row items-center gap-3 md:gap-4 transition-all duration-300 h-20 md:h-24 select-none ${
                  isComingSoon
                    ? "opacity-60 cursor-default bg-slate-50"
                    : "cursor-pointer hover:shadow-md hover:border-brand-300 hover:z-50"
                }`}
                onClick={(e: React.MouseEvent) => {
                  if ((e.target as HTMLElement).closest('.dropdown-menu')) return;
                  if (!isComingSoon) router.push(`/${root.slug}`);
                }}
              >
                {Icon && (
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    isComingSoon ? 'bg-slate-100' : 'bg-brand-50 group-hover:bg-brand-100'
                  }`}>
                     <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isComingSoon ? 'text-slate-400' : 'text-brand-600'} transition-transform duration-300 group-hover:scale-110`} />
                  </div>
                 
                )}
                
                <span className={`text-xs md:text-sm font-bold leading-tight text-left ${
                    isComingSoon ? 'text-slate-400' : 'text-slate-700 group-hover:text-brand-700'
                }`}>
                  {root.name}
                </span>

                {isComingSoon && (
                  <div className="absolute top-2 right-2 bg-slate-200 text-slate-500 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    Snart
                  </div>
                )}

                {/* Hover-meny (Dropdown) */}
                {!isComingSoon && (
                  <div
                    className="dropdown-menu absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 flex flex-col 
                              opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible 
                              transition-all duration-200 origin-top transform scale-95 group-hover:scale-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                     <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-slate-100 rotate-45"></div>
                    <div
                      className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 cursor-pointer hover:bg-slate-100 rounded-t-xl relative z-10"
                      onClick={() => router.push(`/${root.slug}`)}
                    >
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                        Gå till kategori
                      </span>
                      <span className="text-xs text-brand-600 font-bold">
                        →
                      </span>
                    </div>
                    <div className="p-1 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 relative z-10">
                      {subs.length > 0 ? (
                        subs.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/${root.slug}/${sub.slug}`}
                            className="block px-3 py-2 text-xs text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors font-medium text-left"
                          >
                            {sub.name}
                          </Link>
                        ))
                      ) : (
                        <span className="block px-3 py-2 text-xs text-slate-400 italic text-center">
                          Inga underkategorier
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
