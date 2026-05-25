import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { apiLogin, persistLogin, logout, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/specialist-login")({
  head: () => ({ meta: [{ title: "Specialist Sign In — Beyond 21" }] }),
  component: SpecialistLogin,
});

function SpecialistLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      if (data.user.role !== "specialist") {
        logout();
        setError("This account is not a specialist account. Please use the parent sign in.");
        return;
      }
      persistLogin(data);
      setUser(data.user);
      navigate({ to: "/specialist" });
    } catch (err: any) {
      setError(err.message || "Login failed");
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
            <h1 className="text-3xl font-bold mt-3">Welcome back!</h1>
            <p className="text-muted-foreground mt-1">Sign in to your specialist account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Your password"
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
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/specialist-signup" className="text-purple-600 font-semibold hover:underline">
              Sign up
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
