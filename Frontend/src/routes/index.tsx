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
      { title: "Beyond 21 | Joyful learning for every child" },
      { name: "description", content: "Beyond 21 is an adaptive learning platform for children with Down Syndrome. It listens in Tunisian Arabic, celebrates every word, and helps parents follow along." },
    ],
  }),
  component: Index,
});

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

function Index() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <Beyond21Logo size={90} />
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/specialist-login" className="rounded-full px-5 py-2.5 font-semibold font-pro text-foreground/70 hover:bg-white/60 transition">
                🩺 Specialist
              </Link>
              <Link to="/parent" className="rounded-full px-5 py-2.5 font-semibold font-pro text-foreground/80 hover:bg-white/60 transition">
                👨‍👩‍👧 Parent space
              </Link>
              <Link to="/select-child" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-bold shadow-soft hover:scale-105 active:scale-95 transition">
                🎈 Start learning →
              </Link>
            </>
          ) : (
            <>
              <Link to="/specialist-login" className="rounded-full px-5 py-2.5 font-semibold font-pro text-foreground/70 hover:bg-white/60 transition">
                🩺 Specialist
              </Link>
              <Link to="/login" className="rounded-full px-5 py-2.5 font-semibold font-pro text-foreground/80 hover:bg-white/60 transition">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-bold shadow-soft hover:scale-105 active:scale-95 transition">
                Get started →
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-8 md:pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-2 text-sm font-semibold text-foreground/70 mb-6">
            <span className="w-2 h-2 rounded-full bg-happy animate-breathe" />
            🇹🇳 A Tunisian innovation for children with Down Syndrome
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Learning that <span className="bg-gradient-celebrate bg-clip-text text-transparent">grows with you</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
            Beyond 21 listens, learns and cheers. Gentle activities in Tunisian Arabic with a friend who knows when to laugh, hint, and rest.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { v: "🧩", l: "Fun activities" },
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
            <div className="text-3xl">💛</div>
            <div>
              <div className="text-xs text-muted-foreground font-pro">Beyond the limits</div>
              <div className="font-bold">Learn, communicate & shine!</div>
            </div>
          </motion.div>
          <motion.div className="absolute -top-6 -right-6 bg-white rounded-3xl p-4 shadow-pop" animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <Mascot size={80} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Four Worlds ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-3xl md:text-4xl font-bold text-center mb-4">
          What your child will explore
        </motion.h2>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">Everything feels like a game so your child enjoys every moment.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "📖", t: "Words", d: "Practice saying words and get encouragement along the way.", color: "bg-sky/20 border-sky/40" },
            { icon: "🎨", t: "Pictures", d: "Visuals that help your child understand what others are saying.", color: "bg-happy/20 border-happy/40" },
            { icon: "🧩", t: "Exercises", d: "Fun quizzes that adapt to how your child is feeling.", color: "bg-sunny/20 border-sunny/40" },
            { icon: "🎙️", t: "Expression", d: "Your child speaks, and Beyond 21 turns it into clear words that everyone can understand.", color: "bg-bubble/20 border-bubble/40" },
          ].map((m, i) => (
            <motion.div
              key={m.t}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-3xl border-2 ${m.color} backdrop-blur p-6 shadow-soft hover:shadow-pop hover:-translate-y-1 transition-all`}
            >
              <div className="text-5xl mb-3">{m.icon}</div>
              <h3 className="font-bold text-lg">{m.t}</h3>
              <p className="text-sm text-muted-foreground mt-2 font-pro">{m.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 pb-24">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-3xl md:text-4xl font-bold text-center mb-4">
          How it works
        </motion.h2>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">Three simple steps to get your child started.</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "1", icon: "👨‍👩‍👧", title: "Sign up as a parent", desc: "Create your account and add your child's profile in seconds." },
            { step: "2", icon: "🎈", title: "Pick an activity", desc: "Choose from words, pictures, exercises, or voice. All in Tunisian Arabic." },
            { step: "3", icon: "📈", title: "Watch them grow", desc: "Follow their progress from your parent space. Every word, every star." },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-celebrate text-white grid place-items-center text-2xl font-bold shadow-pop mb-4">{s.step}</div>
              <div className="text-4xl mb-2">{s.icon}</div>
              <h3 className="font-bold text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 font-pro">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── What makes us different ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-3xl md:text-4xl font-bold text-center mb-4">
          What makes Beyond 21 special
        </motion.h2>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">Designed from the start for children with Down Syndrome and their families.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "🗣️", title: "Tunisian Arabic", desc: "Your child learns in the language they hear every day. Not translated, built natively." },
            { icon: "🧠", title: "Learns with your child", desc: "Activities get easier or harder based on how your child is feeling, so they never get overwhelmed." },
            { icon: "👪", title: "Follow their journey", desc: "Parents can follow their child's progress and see how they're growing over time." },
            { icon: "🩺", title: "Specialist support", desc: "Specialists can follow your child's progress and provide guidance along the way." },
            { icon: "🎈", title: "Fun activities", desc: "Games, pictures, and interactive exercises that keep your child engaged and happy." },
            { icon: "💛", title: "Built with love", desc: "Every detail is made to encourage, never pressure. Your child goes at their own pace." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-3xl bg-white/80 backdrop-blur p-6 shadow-soft"
            >
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 font-pro">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── For specialists ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="rounded-[2.5rem] bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
        >
          <div className="text-7xl">🩺</div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">For Specialists</h2>
            <p className="text-muted-foreground mb-6">
              Are you a speech therapist, pediatrician, or special education teacher? Beyond 21 gives you tools to analyze brain scans, monitor children's progress, and support families with data-driven insights.
            </p>
            <Link to="/specialist-login" className="inline-flex rounded-full bg-purple-600 text-white px-8 py-3.5 font-bold shadow-soft hover:bg-purple-700 hover:scale-105 active:scale-95 transition">
              🩺 Specialist portal
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 pb-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          <Mascot mood="celebrate" size={120} />
          <h2 className="text-3xl md:text-4xl font-bold mt-6 mb-3">Ready to start the journey?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Every child learns differently. Beyond 21 meets yours right where they are.</p>
          <Link to={user ? "/select-child" : "/signup"} className="inline-flex rounded-full bg-primary text-primary-foreground px-10 py-4 text-lg font-bold shadow-pop hover:scale-105 active:scale-95 transition">
            🎈 Get started for free
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/40 bg-white/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Beyond21Logo size={48} />
          </div>
          <p className="text-sm text-muted-foreground">Made with ♥ in Tunisia. For every child who deserves to shine.</p>
        </div>
      </footer>
    </main>
  );
}
