import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { apiRegister, persistLogin, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/specialist-signup")({
  head: () => ({ meta: [{ title: "Specialist Sign Up — Beyond 21" }] }),
  component: SpecialistSignup,
});

const SPECIALTIES = [
  { label: "Speech Therapist", icon: "🗣️" },
  { label: "Occupational Therapist", icon: "🤲" },
  { label: "Special Education", icon: "📚" },
  { label: "Pediatrician", icon: "👶" },
  { label: "Psychologist", icon: "🧠" },
  { label: "Neurologist", icon: "🔬" },
  { label: "Other", icon: "➕" },
];

function SpecialtyDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = SPECIALTIES.find((s) => s.label === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-semibold mb-1.5">Specialty</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-base transition cursor-pointer ${
          open
            ? "border-purple-400 ring-2 ring-purple-400/40"
            : "border-border hover:border-purple-300"
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-100 grid place-items-center text-lg">{selected.icon}</span>
            <span className="font-medium">{selected.label}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Choose your specialty</span>
        )}
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="text-muted-foreground shrink-0"
        >
          <path d="M4.5 6.75l4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <input type="text" value={value} required tabIndex={-1} className="sr-only" onChange={() => {}} />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 mt-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-border shadow-xl overflow-hidden"
          >
            <div className="py-1.5 max-h-[280px] overflow-y-auto">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => { onChange(s.label); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all ${
                    value === s.label
                      ? "bg-purple-50"
                      : "hover:bg-purple-50/60"
                  }`}
                >
                  <span className={`w-9 h-9 rounded-xl grid place-items-center text-lg transition ${
                    value === s.label ? "bg-purple-600 text-white shadow-sm" : "bg-purple-100"
                  }`}>
                    {s.icon}
                  </span>
                  <span className={`font-medium text-sm ${value === s.label ? "text-purple-700" : "text-foreground"}`}>
                    {s.label}
                  </span>
                  {value === s.label && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto text-purple-600"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                    >
                      <path d="M4 9.5l3 3 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpecialistSignup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRegister(email, password, fullName, "specialist", specialty);
      persistLogin(data);
      setUser(data.user);
      navigate({ to: "/specialist" });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <FloatingBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", duration: 0.7 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/90 backdrop-blur-lg rounded-[2.5rem] shadow-pop p-8 md:p-10">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Beyond21Logo size={56} />
            </div>
            <div className="w-20 h-20 mx-auto rounded-full bg-purple-100 grid place-items-center text-4xl">🩺</div>
            <h1 className="text-3xl font-bold mt-3">Get Started</h1>
            <p className="text-muted-foreground mt-1">Join Beyond 21 as a specialist</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40 transition"
                placeholder="Dr. Jane Smith"
              />
            </div>
            <SpecialtyDropdown value={specialty} onChange={setSpecialty} />
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40 transition"
                placeholder="doctor@clinic.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40 transition"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40 transition"
                placeholder="Repeat your password"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-4 py-2">
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-purple-600 text-white py-3.5 text-lg font-bold shadow-soft hover:bg-purple-700 hover:scale-[1.02] active:scale-95 transition disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create specialist account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/specialist-login" className="text-purple-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>

          <div className="text-center mt-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              Back to home
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
