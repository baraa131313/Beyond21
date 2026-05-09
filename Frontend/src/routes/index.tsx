import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import onboarding from "@/assets/onboarding-hero.jpg";
import { Mascot } from "@/components/Mascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beyond 21 — Joyful learning for every child" },
      { name: "description", content: "Beyond 21 — an adaptive learning platform for children with Down Syndrome. Listens in Tunisian Arabic, celebrates every word, and helps parents follow along." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <Beyond21Logo size={56} />
          <span className="font-bold text-2xl tracking-tight">Beyond 21</span>
        </div>
        <nav className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              <Link to="/parent" className="hidden md:inline-flex rounded-full px-5 py-2.5 font-semibold font-pro text-foreground/80 hover:bg-white/60 transition">
                👨‍👩‍👧 Parent space
              </Link>
              <Link to="/select-child" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-bold shadow-soft hover:scale-105 active:scale-95 transition">
                🎈 Start learning →
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden md:inline-flex rounded-full px-5 py-2.5 font-semibold font-pro text-foreground/80 hover:bg-white/60 transition">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-bold shadow-soft hover:scale-105 active:scale-95 transition">
                Get started →
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-8 md:pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-2 text-sm font-semibold text-foreground/70 mb-6">
            <span className="w-2 h-2 rounded-full bg-happy animate-breathe" />
            Made with love for kids with Down Syndrome 🇹🇳
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Learning that <span className="bg-gradient-celebrate bg-clip-text text-transparent">grows with you</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
            Beyond 21 listens, learns and cheers — gentle activities in Tunisian Arabic with a friend who knows when to laugh, hint, and rest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <>
                <Link to="/select-child" className="rounded-full bg-primary text-primary-foreground px-8 py-4 text-lg font-bold shadow-pop hover:scale-105 active:scale-95 transition">
                  🎈 Let's begin
                </Link>
                <Link to="/parent" className="rounded-full bg-white text-foreground px-8 py-4 text-lg font-bold shadow-soft hover:scale-105 active:scale-95 transition">
                  👨‍👩‍👧 Parent dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup" className="rounded-full bg-primary text-primary-foreground px-8 py-4 text-lg font-bold shadow-pop hover:scale-105 active:scale-95 transition">
                  🎈 Let's begin
                </Link>
                <Link to="/login" className="rounded-full bg-white text-foreground px-8 py-4 text-lg font-bold shadow-soft hover:scale-105 active:scale-95 transition">
                  Sign in
                </Link>
              </>
            )}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { v: "4", l: "Fun activities" },
              { v: "🌍", l: "Tunisian Arabic" },
              { v: "♥", l: "Always kind" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/70 backdrop-blur p-4 text-center shadow-soft">
                <div className="text-2xl font-bold text-primary">{s.v}</div>
                <div className="text-xs text-muted-foreground font-pro mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
          <div className="absolute -inset-6 bg-gradient-celebrate blur-3xl opacity-40 rounded-[3rem]" />
          <img src={onboarding} alt="Tunisian children learning together" width={1536} height={1024} className="relative rounded-[2.5rem] shadow-pop w-full" />
          <motion.div className="absolute -bottom-6 -left-6 bg-white rounded-3xl p-4 shadow-pop flex items-center gap-3" animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
            <div className="text-3xl">⭐</div>
            <div>
              <div className="text-xs text-muted-foreground font-pro">Today</div>
              <div className="font-bold">12 stars earned!</div>
            </div>
          </motion.div>
          <motion.div className="absolute -top-6 -right-6 bg-white rounded-3xl p-4 shadow-pop" animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <Mascot size={80} />
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Four playful worlds</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "📖", t: "Learn a Word", d: "Say it, see it light up." },
            { icon: "🎨", t: "Show Me a Picture", d: "Speak freely and watch pictures appear." },
            { icon: "🧩", t: "Exercises", d: "Fun games and matching puzzles." },
            { icon: "🎙️", t: "My Voice", d: "Teach Beyond 21 your special voice." },
          ].map((m) => (
            <div key={m.t} className="rounded-3xl bg-white/80 backdrop-blur p-6 shadow-soft hover:shadow-pop hover:-translate-y-1 transition-all">
              <div className="text-5xl mb-3">{m.icon}</div>
              <h3 className="font-bold text-lg">{m.t}</h3>
              <p className="text-sm text-muted-foreground mt-2 font-pro">{m.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
