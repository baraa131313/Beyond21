import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { WORDS } from "@/data/words";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { getActiveChild, setActiveChild, fetchActivity, fetchChildren, useAuth, logout, type Child } from "@/lib/auth";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard. Beyond 21" },
      { name: "description", content: "Follow your child's learning journey." },
    ],
  }),
  component: Parent,
});

function getChild() {
  const active = getActiveChild();
  if (active) return { emoji: active.avatar || "🧒", name: active.name, age: active.age };
  return null;
}

function Parent() {
  const { user, setUser, setChild: setContextChild } = useAuth();
  const navigate = useNavigate();
  const [activeChild, setActiveChildState] = useState(getChild);
  const [siblings, setSiblings] = useState<Child[]>([]);

  useEffect(() => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.role === "specialist") { navigate({ to: "/specialist" }); return; }
    if (!activeChild) { navigate({ to: "/select-child" }); return; }
    fetchChildren().then(setSiblings).catch(() => {});
  }, [user]);

  function switchChild(c: Child) {
    setActiveChild(c);
    setContextChild(c);
    setActiveChildState({ emoji: c.avatar || "🧒", name: c.name, age: c.age });
    window.location.reload();
  }

  if (!activeChild) return null;
  const child = activeChild;

  return (
    <div className="min-h-screen font-pro">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-border/50 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Beyond21Logo size={48} />
          </Link>
          <div className="flex items-center gap-3">
            {siblings.length > 1 && (
              <div className="flex items-center gap-1 bg-primary/5 rounded-full px-3 py-1.5">
                {siblings.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => switchChild(s)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      s.name === child.name ? "bg-primary text-primary-foreground" : "hover:bg-white text-foreground/70"
                    }`}
                  >
                    <span className="mr-1">{s.avatar || "🧒"}</span>{s.name}
                  </button>
                ))}
              </div>
            )}
            <Link to="/learn" className="rounded-full bg-mint px-5 py-2.5 text-sm font-bold text-foreground hover:scale-105 transition">
              🎈 Learning hub
            </Link>
            <button
              onClick={() => { logout(); setUser(null); navigate({ to: "/" }); }}
              className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 md:p-10">
        <ProgressPage child={child} />
      </main>
    </div>
  );
}

type Pronunciation = {
  ts: number;
  wordId: string;
  wordAr: string;
  emoji: string;
  passed: boolean;
  overallScore: number;
  phonemeScores: Array<{ arabic: string; stars: number }>;
};

type Quiz = {
  ts: number;
  totalQuestions: number;
  correct: number;
  avgT: number;
  avgI: number;
  avgF: number;
  dominantAction: string | null;
};

function ProgressPage({ child }: { child: { emoji: string; name: string; age: number | null } }) {
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [totalStars, setTotalStars] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeChild = getActiveChild();
    if (!activeChild) return;

    function load() {
      fetchActivity(activeChild!.id)
        .then((remote) => {
          const p: Pronunciation[] = (remote.pronunciations || []).map((p: any) => ({
            ts: new Date(p.created_at).getTime(),
            wordId: p.word_id,
            wordAr: p.word_ar,
            emoji: p.emoji,
            passed: p.passed,
            overallScore: p.overall_score,
            phonemeScores: typeof p.phoneme_scores === "string" ? JSON.parse(p.phoneme_scores) : (p.phoneme_scores || []),
          }));
          const q: Quiz[] = (remote.quizzes || []).map((q: any) => ({
            ts: new Date(q.created_at).getTime(),
            totalQuestions: q.total_questions,
            correct: q.correct,
            avgT: q.avg_t,
            avgI: q.avg_i,
            avgF: q.avg_f,
            dominantAction: q.dominant_action,
          }));
          setPronunciations(p);
          setQuizzes(q);
          setTotalStars(remote.total_stars || 0);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalAttempts = pronunciations.length;
  const totalPassed = pronunciations.filter((p) => p.passed).length;
  const successRate = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0;
  const quizzesDone = quizzes.length;
  const avgQuizScore = quizzesDone > 0
    ? Math.round(quizzes.reduce((s, q) => s + (q.correct / q.totalQuestions) * 100, 0) / quizzesDone)
    : 0;

  const wordStats = new Map<string, { attempts: number; passes: number; bestScore: number }>();
  for (const p of pronunciations) {
    const existing = wordStats.get(p.wordId) || { attempts: 0, passes: 0, bestScore: 0 };
    existing.attempts++;
    if (p.passed) existing.passes++;
    if (p.overallScore > existing.bestScore) existing.bestScore = p.overallScore;
    wordStats.set(p.wordId, existing);
  }
  const wordsMastered = Array.from(wordStats.values()).filter((s) => s.passes >= 1).length;

  const categories: Record<string, { attempts: number; passed: number }> = {};
  for (const p of pronunciations) {
    const word = WORDS.find((w) => w.id === p.wordId);
    if (!word) continue;
    if (!categories[word.category]) categories[word.category] = { attempts: 0, passed: 0 };
    categories[word.category].attempts++;
    if (p.passed) categories[word.category].passed++;
  }
  const catLabels: Record<string, string> = {
    animals: "Animals 🐱", food: "Food 🍞", body: "Body 👁️", transport: "Transport 🚗", nature: "Nature 🌙", family: "Family 👨",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold">My Child's Progress</h1>
        <p className="text-muted-foreground mt-1">All of {child.name}'s learning activity in one place</p>
      </div>

      {/* Child header + stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-soft md:col-span-2 flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-celebrate grid place-items-center text-4xl shadow-soft">{child.emoji}</div>
          <div className="flex-1">
            <div className="font-bold text-2xl">{child.name} {child.age && <span className="text-sm text-muted-foreground font-normal">· {child.age} years</span>}</div>
            <div className="grid grid-cols-4 gap-3 mt-3 text-center text-sm">
              <div><div className="text-2xl font-bold text-primary">{wordsMastered}</div><div className="text-muted-foreground">Words mastered</div></div>
              <div><div className="text-2xl font-bold text-primary">{totalAttempts}</div><div className="text-muted-foreground">Pronunciations</div></div>
              <div><div className="text-2xl font-bold text-primary">{quizzesDone}</div><div className="text-muted-foreground">Quizzes done</div></div>
              <div><div className="text-2xl font-bold text-primary">{totalStars}</div><div className="text-muted-foreground">Stars earned</div></div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-celebrate text-white rounded-3xl p-6 shadow-pop">
          <div className="font-semibold opacity-90">Quiz Average</div>
          <div className="text-3xl font-bold mt-1">{quizzesDone > 0 ? `${avgQuizScore}%` : "No quizzes yet"}</div>
          {quizzes.length > 0 && (
            <div className="mt-3 flex items-end gap-1 h-16">
              {quizzes.slice(-7).map((q, i) => (
                <div key={i} className="flex-1 bg-white/30 rounded-t" style={{ height: `${(q.correct / q.totalQuestions) * 100}%` }} />
              ))}
            </div>
          )}
          {quizzes.length === 0 && <p className="text-sm opacity-80 mt-3">Scores will appear here after quizzes</p>}
        </div>
      </div>

      {/* Recent quiz sessions */}
      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="font-bold text-lg mb-3">🧩 Quiz Sessions</h3>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quiz sessions recorded yet. Start a quiz from the learning hub.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.slice(0, 15).map((q, i) => {
                  const pct = Math.round((q.correct / q.totalQuestions) * 100);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="py-3 text-muted-foreground">{new Date(q.ts).toLocaleDateString()} {new Date(q.ts).toLocaleTimeString()}</td>
                      <td className="font-bold">{pct}%</td>
                      <td>{q.correct}/{q.totalQuestions}</td>
                      <td>{q.correct === q.totalQuestions ? "🌟 Perfect" : pct >= 70 ? "⭐ Great" : "💪 Keep going"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pronunciation progress grid */}
      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="font-bold text-lg mb-3">🎤 Word Progress</h3>
        <div className="flex gap-4 mb-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-happy" /> Mastered</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sunny" /> Practiced</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> Not tried</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {WORDS.map((w) => {
            const stats = wordStats.get(w.id);
            let state: "mastered" | "practiced" | "new" = "new";
            if (stats && stats.passes >= 1) state = "mastered";
            else if (stats && stats.attempts >= 1) state = "practiced";
            return (
              <div
                key={w.id}
                className={`rounded-2xl p-3 text-center border-2 transition ${
                  state === "mastered" ? "border-happy bg-happy/20" :
                  state === "practiced" ? "border-sunny bg-sunny/20" :
                  "border-muted bg-muted/30"
                }`}
              >
                <div className="text-4xl">{w.emoji}</div>
                <div className="font-arabic text-lg font-bold mt-1" dir="rtl">{w.ar}</div>
                {stats ? (
                  <div className="text-xs text-muted-foreground mt-1">{stats.attempts} tries · {stats.passes} passed</div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">Not tried yet</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quality by category */}
      {Object.keys(categories).length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold text-lg mb-3">📊 Quality by Category</h3>
          {Object.entries(catLabels).map(([cat, label]) => {
            const stats = categories[cat];
            if (!stats) return null;
            const v = Math.round((stats.passed / stats.attempts) * 100);
            return (
              <div key={cat} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{label}</span>
                  <span className="font-bold">{v}% ({stats.passed}/{stats.attempts})</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-celebrate transition-all" style={{ width: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent pronunciation attempts */}
      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="font-bold text-lg mb-3">🗣️ Recent Pronunciation Attempts</h3>
        {pronunciations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pronunciation attempts yet. Try the Words activity from the learning hub.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr>
                  <th className="py-2">Word</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th>Phonemes</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {pronunciations.slice(0, 20).map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-3">
                      <span className="text-2xl mr-2">{p.emoji}</span>
                      <span className="font-arabic text-lg" dir="rtl">{p.wordAr}</span>
                    </td>
                    <td>{p.passed ? "✅" : "🔄"}</td>
                    <td className="font-bold">{Math.round(p.overallScore)}%</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {p.phonemeScores.map((ph, j) => (
                          <span
                            key={j}
                            className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                              ph.stars >= 3 ? "bg-green-100 text-green-700" :
                              ph.stars >= 2 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}
                          >
                            {ph.arabic} {"⭐".repeat(ph.stars)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(p.ts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Empty state */}
      {totalAttempts === 0 && quizzesDone === 0 && (
        <div className="bg-white rounded-3xl p-12 shadow-soft text-center">
          <div className="text-6xl mb-4">🎈</div>
          <h3 className="font-bold text-xl">No activity yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            When {child.name} starts learning, all progress from quizzes and pronunciation practice will appear here automatically.
          </p>
          <Link to="/learn" className="mt-6 inline-block rounded-full bg-primary text-primary-foreground px-8 py-3 font-bold shadow-soft hover:scale-105 transition">
            🎈 Start learning
          </Link>
        </div>
      )}
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
