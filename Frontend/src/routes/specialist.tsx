import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { MedicalInsights } from "@/components/MedicalInsights";
import {
  useAuth,
  logout,
  fetchSpecialistChildren,
  fetchPlatformStats,
  fetchActivity,
  fetchProgress,
  fetchCustomWords,
  fetchCustomQuizzes,
  createCustomWord,
  createCustomQuiz,
  deleteCustomWord,
  deleteCustomQuiz,
  type SpecialistChild,
  type PlatformStats,
  type CustomWordData,
  type CustomQuizData,
} from "@/lib/auth";

export const Route = createFileRoute("/specialist")({
  head: () => ({
    meta: [
      { title: "Specialist Dashboard" },
      { name: "description", content: "Specialist dashboard for Beyond 21." },
    ],
  }),
  component: Specialist,
});

const TABS = [
  { id: "overview", label: "Dashboard", icon: "🏠" },
  { id: "children", label: "Children Progress", icon: "👶" },
  { id: "content", label: "Learning Content", icon: "📝" },
  { id: "brain", label: "Brain Analysis", icon: "🧠" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Specialist() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!user) {
      navigate({ to: "/specialist-login" });
      return;
    }
    if (user.role !== "specialist") {
      navigate({ to: "/select-child" });
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-border/50 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Beyond21Logo size={44} />
            <div>
              <h1 className="font-bold text-lg">Beyond 21</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.full_name || "Specialist"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-purple-100 text-purple-700 text-sm font-bold px-4 py-2 rounded-full">🩺 {user?.specialty || "Specialist"}</span>
            <button
              onClick={() => { logout(); setUser(null); navigate({ to: "/" }); }}
              className="rounded-full bg-white border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white/60 backdrop-blur border-b border-border/30">
        <div className="max-w-[1400px] mx-auto px-6 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition ${
                tab === t.id ? "text-purple-700" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="specialist-tab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-600 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto p-6 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "overview" && <OverviewTab />}
            {tab === "children" && <ChildrenTab />}
            {tab === "content" && <ContentTab />}
            {tab === "brain" && <MedicalInsights />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ── Overview Tab ── */

function OverviewTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [children, setChildren] = useState<SpecialistChild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchPlatformStats(), fetchSpecialistChildren()])
      .then(([s, c]) => { setStats(s); setChildren(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  const recentChildren = children.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-3xl p-8 text-white">
        <h2 className="text-2xl font-bold">Good to see you, {user?.full_name?.split(" ")[0] || "Doctor"} 👋</h2>
        <p className="mt-2 text-purple-100 max-w-xl">
          Here is an overview of the children on the platform. You can view their progress, speech practice, and run brain scan analysis.
        </p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Children", value: stats.total_children, icon: "👶", color: "bg-blue-50 text-blue-700" },
            { label: "Families", value: stats.total_parents, icon: "👨‍👩‍👧", color: "bg-green-50 text-green-700" },
            { label: "Words practiced", value: stats.total_pronunciations, icon: "🗣️", color: "bg-orange-50 text-orange-700" },
            { label: "Quizzes taken", value: stats.total_quizzes, icon: "🧩", color: "bg-pink-50 text-pink-700" },
            { label: "Stars earned", value: stats.total_stars, icon: "⭐", color: "bg-yellow-50 text-yellow-700" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-soft">
              <div className={`w-10 h-10 rounded-xl ${s.color} grid place-items-center text-lg mb-3`}>{s.icon}</div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent children */}
      {recentChildren.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold text-lg mb-4">Recent children</h3>
          <div className="space-y-3">
            {recentChildren.map((child) => (
              <div key={child.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-purple-50/50 transition">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 grid place-items-center text-2xl">{child.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{child.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {child.age ? `${child.age} years old` : "Age not set"} · Parent: {child.parent_name}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>🗣️ {child.pronunciation_attempts}</span>
                  <span>🧩 {child.quiz_sessions}</span>
                  <span>⭐ {child.total_stars}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {children.length === 0 && !loading && (
        <div className="bg-white rounded-3xl p-12 shadow-soft text-center">
          <div className="text-5xl mb-4">👶</div>
          <h3 className="font-bold text-lg">No children registered yet</h3>
          <p className="text-muted-foreground mt-2">When parents create accounts and add their children, they will appear here.</p>
        </div>
      )}
    </div>
  );
}

/* ── Children Tab ── */

function ChildrenTab() {
  const [children, setChildren] = useState<SpecialistChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SpecialistChild | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSpecialistChildren()
      .then(setChildren)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = children.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.parent_name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (selected) {
    return <ChildDetail child={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">All children</h2>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="rounded-2xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/40 transition w-64"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow-soft text-center">
          <div className="text-5xl mb-4">{search ? "🔍" : "👶"}</div>
          <h3 className="font-bold text-lg">{search ? "No results found" : "No children registered yet"}</h3>
          <p className="text-muted-foreground mt-2">
            {search ? "Try a different search term." : "When parents create accounts and add their children, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelected(child)}
              className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-pop hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 grid place-items-center text-3xl">{child.avatar}</div>
                <div>
                  <p className="font-bold text-lg">{child.name}</p>
                  <p className="text-sm text-muted-foreground">{child.age ? `${child.age} years old` : "Age not set"}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                👨‍👩‍👧 Parent: {child.parent_name}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-purple-50 p-2.5 text-center">
                  <p className="text-lg font-bold text-purple-700">{child.pronunciation_attempts}</p>
                  <p className="text-xs text-muted-foreground">Words</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-2.5 text-center">
                  <p className="text-lg font-bold text-blue-700">{child.quiz_sessions}</p>
                  <p className="text-xs text-muted-foreground">Quizzes</p>
                </div>
                <div className="rounded-xl bg-yellow-50 p-2.5 text-center">
                  <p className="text-lg font-bold text-yellow-700">{child.total_stars}</p>
                  <p className="text-xs text-muted-foreground">Stars</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Child Detail ── */

function ChildDetail({ child, onBack }: { child: SpecialistChild; onBack: () => void }) {
  const [activityData, setActivityData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchActivity(child.id).catch(() => null),
      fetchProgress(child.id).catch(() => null),
    ]).then(([a, p]) => {
      setActivityData(a);
      setProgressData(p);
    }).finally(() => setLoading(false));
  }, [child.id]);

  const pronunciations = activityData?.pronunciations || [];
  const quizzes = activityData?.quizzes || [];
  const totalStars = activityData?.total_stars || 0;

  const passedCount = pronunciations.filter((p: any) => p.passed).length;
  const avgScore = pronunciations.length
    ? (pronunciations.reduce((s: number, p: any) => s + p.overall_score, 0) / pronunciations.length).toFixed(1)
    : "0";

  const quizCorrectTotal = quizzes.reduce((s: number, q: any) => s + q.correct, 0);
  const quizQuestionTotal = quizzes.reduce((s: number, q: any) => s + q.total_questions, 0);
  const quizAccuracy = quizQuestionTotal ? Math.round((quizCorrectTotal / quizQuestionTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 transition">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to all children
      </button>

      <div className="bg-white rounded-3xl p-6 shadow-soft flex items-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-purple-100 grid place-items-center text-5xl">{child.avatar}</div>
        <div>
          <h2 className="text-2xl font-bold">{child.name}</h2>
          <p className="text-muted-foreground mt-1">
            {child.age ? `${child.age} years old` : "Age not set"} · Parent: {child.parent_name}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total stars", value: totalStars, icon: "⭐", color: "bg-yellow-50" },
              { label: "Words passed", value: `${passedCount}/${pronunciations.length}`, icon: "🗣️", color: "bg-orange-50" },
              { label: "Avg. score", value: avgScore, icon: "📊", color: "bg-blue-50" },
              { label: "Quiz accuracy", value: `${quizAccuracy}%`, icon: "🧩", color: "bg-green-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-2xl p-5`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pronunciation history */}
          <div className="bg-white rounded-3xl p-6 shadow-soft">
            <h3 className="font-bold text-lg mb-4">🗣️ Speech practice history</h3>
            {pronunciations.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No speech practice recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {pronunciations.slice(0, 30).map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-purple-50/50 transition">
                    <div className={`w-10 h-10 rounded-xl grid place-items-center text-lg ${p.passed ? "bg-green-100" : "bg-orange-100"}`}>
                      {p.emoji || (p.passed ? "✅" : "🔄")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{p.word_ar}</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {(p.overall_score * 100).toFixed(0)}% · {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.passed ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {p.passed ? "Passed" : "Practicing"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiz history */}
          <div className="bg-white rounded-3xl p-6 shadow-soft">
            <h3 className="font-bold text-lg mb-4">🧩 Quiz history</h3>
            {quizzes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No quizzes taken yet.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {quizzes.slice(0, 20).map((q: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-purple-50/50 transition">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 grid place-items-center text-lg">🧩</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{q.correct}/{q.total_questions} correct</p>
                      <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      q.correct / q.total_questions >= 0.7 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {Math.round((q.correct / q.total_questions) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress summary */}
          {progressData && (
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <h3 className="font-bold text-lg mb-4">📈 Progress summary</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xl font-bold">{progressData.total_stars}</p>
                  <p className="text-xs text-muted-foreground">Total stars</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xl font-bold">{progressData.total_correct}</p>
                  <p className="text-xs text-muted-foreground">Correct answers</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xl font-bold">{progressData.words_practiced}</p>
                  <p className="text-xs text-muted-foreground">Words practiced</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xl font-bold">{progressData.modules_used?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Activities used</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Content Tab ── */

function ContentTab() {
  const [section, setSection] = useState<"words" | "quizzes">("words");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold flex-1">Learning Content</h2>
        <div className="flex bg-white rounded-2xl p-1 shadow-soft">
          <button
            onClick={() => setSection("words")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              section === "words" ? "bg-purple-600 text-white" : "hover:bg-purple-50"
            }`}
          >
            🗣️ Words
          </button>
          <button
            onClick={() => setSection("quizzes")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              section === "quizzes" ? "bg-purple-600 text-white" : "hover:bg-purple-50"
            }`}
          >
            🧩 Quizzes
          </button>
        </div>
      </div>

      {section === "words" ? <WordsManager /> : <QuizzesManager />}
    </div>
  );
}

/* ── Words Manager ── */

const CATEGORIES = ["animals", "food", "transport", "body", "nature"];

function WordsManager() {
  const [words, setWords] = useState<CustomWordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [ar, setAr] = useState("");
  const [translit, setTranslit] = useState("");
  const [en, setEn] = useState("");
  const [emoji, setEmoji] = useState("");
  const [category, setCategory] = useState("animals");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomWords()
      .then(setWords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const word = await createCustomWord({ ar, translit, en, emoji, category });
      setWords([word, ...words]);
      setShowForm(false);
      setAr(""); setTranslit(""); setEn(""); setEmoji(""); setCategory("animals");
    } catch {
      alert("Failed to add word");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(word: CustomWordData) {
    const numId = parseInt(word.id.replace("cw", ""));
    try {
      await deleteCustomWord(numId);
      setWords(words.filter((w) => w.id !== word.id));
    } catch {
      alert("Failed to delete word");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Words you add here will be available for children to practice.</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-purple-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-purple-700 transition"
        >
          + Add word
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="bg-white rounded-3xl p-6 shadow-soft space-y-4 overflow-hidden"
          >
            <h3 className="font-bold text-lg">New word</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Arabic word</label>
                <input
                  type="text"
                  value={ar}
                  onChange={(e) => setAr(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="قَطُّوس"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Transliteration</label>
                <input
                  type="text"
                  value={translit}
                  onChange={(e) => setTranslit(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="gattous"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">English meaning</label>
                <input
                  type="text"
                  value={en}
                  onChange={(e) => setEn(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="Cat"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Emoji</label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="🐱"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Category</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition capitalize ${
                      category === c ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-purple-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-purple-700 transition disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add word"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full bg-white border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {words.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow-soft text-center">
          <div className="text-5xl mb-4">🗣️</div>
          <h3 className="font-bold text-lg">No custom words yet</h3>
          <p className="text-muted-foreground mt-2">Add new Arabic words for children to practice.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {words.map((word) => (
            <div key={word.id} className="bg-white rounded-2xl p-4 shadow-soft flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 grid place-items-center text-2xl">{word.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold" dir="rtl">{word.ar}</p>
                <p className="text-sm text-muted-foreground">{word.en} · {word.translit}</p>
              </div>
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full capitalize">{word.category}</span>
              <button
                onClick={() => handleDelete(word)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition p-1"
                title="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Quizzes Manager ── */

function QuizzesManager() {
  const [quizzes, setQuizzes] = useState<CustomQuizData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState([
    { label: "", value: "a", correct: true },
    { label: "", value: "b", correct: false },
    { label: "", value: "c", correct: false },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomQuizzes()
      .then(setQuizzes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateOption(i: number, field: string, value: any) {
    setOptions(options.map((o, idx) => {
      if (idx !== i) return field === "correct" && value ? { ...o, correct: false } : o;
      return { ...o, [field]: value };
    }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (options.some((o) => !o.label.trim())) {
      alert("Please fill in all options");
      return;
    }
    setSaving(true);
    try {
      const quiz = await createCustomQuiz({
        question_text: questionText,
        question_type: "emoji-choice",
        options,
      });
      setQuizzes([quiz, ...quizzes]);
      setShowForm(false);
      setQuestionText("");
      setOptions([
        { label: "", value: "a", correct: true },
        { label: "", value: "b", correct: false },
        { label: "", value: "c", correct: false },
      ]);
    } catch {
      alert("Failed to add quiz question");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCustomQuiz(id);
      setQuizzes(quizzes.filter((q) => q.id !== id));
    } catch {
      alert("Failed to delete quiz");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Quiz questions you add here will appear in the exercises.</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-purple-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-purple-700 transition"
        >
          + Add question
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="bg-white rounded-3xl p-6 shadow-soft space-y-4 overflow-hidden"
          >
            <h3 className="font-bold text-lg">New quiz question</h3>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Question</label>
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-white px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                placeholder="Find the Animal! 🔍"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Options (click the circle to mark the correct answer)</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateOption(i, "correct", true)}
                      className={`w-7 h-7 rounded-full border-2 grid place-items-center transition shrink-0 ${
                        opt.correct ? "border-green-500 bg-green-500 text-white" : "border-border hover:border-green-300"
                      }`}
                    >
                      {opt.correct && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => updateOption(i, "label", e.target.value)}
                      className="flex-1 rounded-2xl border border-border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOptions([...options, { label: "", value: String.fromCharCode(97 + options.length), correct: false }])}
                className="mt-2 text-sm text-purple-600 font-semibold hover:text-purple-700"
              >
                + Add option
              </button>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-purple-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-purple-700 transition disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add question"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full bg-white border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow-soft text-center">
          <div className="text-5xl mb-4">🧩</div>
          <h3 className="font-bold text-lg">No custom quiz questions yet</h3>
          <p className="text-muted-foreground mt-2">Add new quiz questions for children to answer during exercises.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => {
            const correctOpt = quiz.options.find((o) => o.correct);
            return (
              <div key={quiz.id} className="bg-white rounded-2xl p-5 shadow-soft group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold">{quiz.question_text}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {quiz.options.map((o, i) => (
                        <span
                          key={i}
                          className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                            o.correct ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {o.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition p-1 shrink-0"
                    title="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
