import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { Mascot } from "@/components/Mascot";
import { apiRegister, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign Up — Beyond 21" }] }),
  component: Signup,
});

function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
      const { user } = await apiRegister(email, password, fullName);
      setUser(user);
      navigate({ to: "/select-child" });
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
            <Mascot mood="celebrate" size={80} />
            <h1 className="text-3xl font-bold mt-3">Create Account</h1>
            <p className="text-muted-foreground mt-1">Set up your parent account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder="parent@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
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
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
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
              className="w-full rounded-full bg-primary text-primary-foreground py-3.5 text-lg font-bold shadow-soft hover:scale-[1.02] active:scale-95 transition disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
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
