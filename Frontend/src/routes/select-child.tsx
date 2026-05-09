import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingBackground } from "@/components/FloatingBackground";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { Mascot } from "@/components/Mascot";
import { fetchChildren, createChild, setActiveChild, logout, useAuth, type Child } from "@/lib/auth";

export const Route = createFileRoute("/select-child")({
  head: () => ({ meta: [{ title: "Choose Learner — Beyond 21" }] }),
  component: SelectChild,
});

const AVATARS = ["🧒", "👧", "👦", "🧒🏽", "👧🏾", "👦🏻", "🐻", "🦊", "🐰", "🐱", "🦁", "🐼"];

function SelectChild() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [avatar, setAvatar] = useState("🧒");
  const [creating, setCreating] = useState(false);
  const { user, setChild } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
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
            navigate({ to: "/login" });
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
                  <label className="block text-sm font-semibold mb-1.5">Name</label>
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
                    min={1}
                    max={30}
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    placeholder="Age"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvatar(a)}
                        className={`w-12 h-12 rounded-full text-2xl grid place-items-center transition ${
                          avatar === a
                            ? "bg-primary/20 ring-2 ring-primary scale-110"
                            : "bg-white hover:bg-primary/5"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
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
