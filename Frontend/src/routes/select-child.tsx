import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { Mascot } from "@/components/Mascot";
import { fetchChildren, createChild, setActiveChild, logout, useAuth, deleteChild, type Child } from "@/lib/auth";

export const Route = createFileRoute("/select-child")({
  head: () => ({ meta: [{ title: "Choose Learner — Beyond 21" }] }),
  component: SelectChild,
});

const AVATARS = [
  "🧒", "👧", "👦", "🧒🏽", "👧🏾", "👦🏻", "👶", "👶🏽",
  "🐻", "🦊", "🐰", "🐱", "🦁", "🐼", "🐶", "🐸",
  "🦋", "🌟", "🌈", "🎈", "🚀", "🦄", "🐬", "🐢",
  "🌻", "⭐", "🎨", "🎵", "🍎", "🧸", "🐝", "🦜",
];

function SelectChild() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [cognitiveLevel, setCognitiveLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [colorsInput, setColorsInput] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [stylePreference, setStylePreference] = useState<"cartoon" | "watercolor" | "realistic">("cartoon");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState("🧒");
  const [creating, setCreating] = useState(false);
  const { user, setUser, setChild } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (user.role === "specialist") {
      navigate({ to: "/specialist" });
      return;
    }
    loadChildren();
  }, [user]);

  async function loadChildren() {
    try {
      const c = await fetchChildren();
      setChildren(c);
    } catch {
      // token might be expired
    } finally {
      setLoading(false);
    }
  }

  function selectChild(child: Child) {
    setActiveChild(child);
    setChild(child);
    navigate({ to: "/learn" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const child = await createChild({
        name,
        age: age ? parseInt(age) : undefined,
        avatar,
      });
      setChildren((prev) => [...prev, child]);
      setShowCreate(false);
      setName("");
      setCognitiveLevel("intermediate");
      setColorsInput("");
      setInterestsInput("");
      setStylePreference("cartoon");
      setAge("");
      setAvatar("🧒");
    } catch {
      alert("Failed to create child profile");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <FloatingBackground />
        <div className="relative z-10 text-center">
          <Mascot mood="thinking" size={120} />
          <p className="mt-4 text-xl font-bold">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Beyond21Logo size={48} />
        </div>
        <button
          onClick={() => {
            logout();
            setUser(null);
            navigate({ to: "/" });
          }}
          className="rounded-full bg-white/80 backdrop-blur px-4 py-2 text-sm font-semibold shadow-soft hover:scale-105 transition"
        >
          Sign out
        </button>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 mt-8 text-center">
        <Mascot size={100} />
        <h1 className="text-3xl md:text-4xl font-bold mt-4">
          Hi, {user?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-lg text-muted-foreground mt-2">Who's learning today?</p>
      </div>

      <section className="relative z-10 max-w-2xl mx-auto px-6 mt-8 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <AnimatePresence>
            {children.map((child, i) => (
              <motion.button
                key={child.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.1, type: "spring" }}
                onClick={() => selectChild(child)}
                className="bg-white/90 backdrop-blur rounded-[2rem] p-6 shadow-soft hover:shadow-pop hover:scale-105 active:scale-95 transition-all text-center"
              >
                <motion.div
                  className="text-6xl mb-3"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                >
                  {child.avatar}
                </motion.div>
                <div className="font-bold text-lg">{child.name}</div>
                {child.age && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {child.age} years old
                  </div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: children.length * 0.1, type: "spring" }}
            onClick={() => setShowCreate(true)}
            className="border-2 border-dashed border-primary/30 rounded-[2rem] p-6 hover:border-primary/60 hover:bg-primary/5 transition-all text-center flex flex-col items-center justify-center min-h-[180px]"
          >
            <div className="text-5xl mb-3">+</div>
            <div className="font-bold text-primary">Add child</div>
          </motion.button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 bg-white/90 backdrop-blur rounded-[2rem] p-8 shadow-pop"
            >
              <h2 className="text-xl font-bold mb-4">New learner profile</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Child's name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    placeholder="Child's name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Age (optional)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min={3}
                    max={18}
                    required
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Cognitive level</label>
                  <select
                    value={cognitiveLevel}
                    onChange={(e) => setCognitiveLevel(e.target.value as "beginner" | "intermediate" | "advanced")}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                  >
                    <option value="beginner">Mild</option>
                    <option value="intermediate">Moderate</option>
                    <option value="advanced">Severe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Favorite colors</label>
                  <input
                    type="text"
                    value={colorsInput}
                    onChange={(e) => setColorsInput(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    placeholder="e.g. blue, yellow, green"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Separate with commas</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Interests</label>
                  <input
                    type="text"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    placeholder="e.g. animals, sports, music"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Separate with commas</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Visual style</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStylePreference("cartoon")}
                      className={`flex-1 rounded-full py-3 font-bold transition ${
                        stylePreference === "cartoon"
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "bg-white border border-border hover:bg-primary/5"
                      }`}
                    >
                      🎨 Cartoon
                    </button>
                    <button
                      type="button"
                      onClick={() => setStylePreference("watercolor")}
                      className={`flex-1 rounded-full py-3 font-bold transition ${
                        stylePreference === "watercolor"
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "bg-white border border-border hover:bg-primary/5"
                      }`}
                    >
                      🖌️ Watercolor
                    </button>
                    <button
                      type="button"
                      onClick={() => setStylePreference("realistic")}
                      className={`flex-1 rounded-full py-3 font-bold transition ${
                        stylePreference === "realistic"
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "bg-white border border-border hover:bg-primary/5"
                      }`}
                    >
                      🖼️ Realistic
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-full bg-primary text-primary-foreground py-3 font-bold shadow-soft hover:scale-[1.02] active:scale-95 transition disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "Create profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-full bg-white border border-border px-6 py-3 font-bold hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 text-center">
          <button
            onClick={() => navigate({ to: "/parent" })}
            className="rounded-full bg-white/80 backdrop-blur px-6 py-3 font-semibold shadow-soft hover:scale-105 transition"
          >
            Go to Parent Dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
