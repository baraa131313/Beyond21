import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mascot } from "@/components/Mascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Beyond21Logo } from "@/components/Beyond21Logo";

export const Route = createFileRoute("/learn/")({
  head: () => ({ meta: [{ title: "Learning Hub — Beyond 21" }] }),
  component: LearnHome,
});

const MODULES = [
  { to: "/learn/word", icon: "📖", art: "✈️", ar: "تَعَلَّم كَلْمَة", title: "Learn a Word", sub: "Say it & see it!", color: "from-mint to-happy" },
  { to: "/learn/picture", icon: "🎨", art: "🦋", ar: "وَرِّيلِي صُورَة", title: "Show Me a Picture", sub: "Speak freely!", color: "from-bubble to-peach" },
  { to: "/learn/talk", icon: "🗣️", art: "💬", ar: "احكي معايا", title: "Free Talk", sub: "I'll understand!", color: "from-peach to-sunny" },
  { to: "/learn/exercises", icon: "🧩", art: "🎯", ar: "تَمَارِين", title: "Exercises", sub: "Let's practice!", color: "from-sky to-bubble" },
  { to: "/learn/voice", icon: "🎙️", art: "🎵", ar: "صَوْتِي", title: "My Voice", sub: "Teach me!", color: "from-sunny to-peach" },
] as const;

function LearnHome() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Beyond21Logo size={48} />
          <Link to="/" className="rounded-full bg-white/80 backdrop-blur w-12 h-12 grid place-items-center text-xl shadow-soft hover:scale-110 active:scale-95 transition" aria-label="Home">
            🏠
          </Link>
        </div>
        <div className="flex items-center gap-3 bg-white/80 rounded-full px-4 py-2 shadow-soft">
          <span className="text-2xl">⭐</span>
          <span className="font-bold text-lg">12</span>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 mt-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <Mascot size={120} />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-bold mt-2">Let's learn! 🎈</h1>
      </div>

      <section className="relative z-10 max-w-4xl mx-auto px-6 mt-8 pb-16">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.to}
              initial={{ opacity: 0, y: 20, rotate: i % 2 === 0 ? -2 : 2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: i * 0.1, type: "spring" }}
            >
              <Link
                to={m.to}
                className={`block rounded-[2.5rem] bg-gradient-to-br ${m.color} p-6 md:p-8 shadow-pop hover:scale-105 active:scale-95 transition-all aspect-square relative overflow-hidden`}
              >
                <motion.div
                  className="text-7xl md:text-9xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] opacity-90"
                  animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
                >
                  {m.art}
                </motion.div>
                <div className="relative h-full flex flex-col justify-end text-white drop-shadow">
                  <div className="text-3xl mb-1">{m.icon}</div>
                  <div className="font-arabic text-2xl md:text-3xl font-black" dir="rtl">{m.ar}</div>
                  <div className="font-bold text-base md:text-lg mt-1">{m.title}</div>
                  <div className="text-xs md:text-sm opacity-90 font-pro">{m.sub}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
