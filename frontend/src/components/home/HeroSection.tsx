"use client";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden py-10 md:py-24 px-4"
      style={{ background: 'linear-gradient(105deg, #020617 0%, #172554 60%, #1e3a8a 100%)' }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-500/[0.05] rounded-full blur-3xl rotate-12" />
      </div>

      <div className="container mx-auto text-center max-w-4xl relative z-10 flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-white mb-4 md:mb-6 leading-[1.1]"
        >
          Spara pengar på{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-blue-400 to-indigo-400">
            varje köp
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto mb-6 md:mb-10 leading-relaxed px-2 md:px-4"
        >
          Sök, kombinera och optimera. Vi hittar den billigaste lösningen för hela din inköpslista.
        </motion.p>
      </div>
    </section>
  );
}
