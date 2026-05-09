import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WORDS, AVATARS } from "@/data/words";
import { Beyond21Logo } from "@/components/Beyond21Logo";
import { useAdaptive, colorForScore } from "@/lib/adaptive";
import { getApiUrl, setApiUrl, checkHealth } from "@/lib/api";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — Beyond 21" },
      { name: "description", content: "Follow your child's learning journey, speech progress, and wellness insights." },
    ],
  }),
  component: Parent,
});

type TabKey = "progress" | "speech" | "exercises" | "medical" | "ai" | "settings";
const TABS: { k: TabKey; i: string; t: string }[] = [
  { k: "progress", i: "📈", t: "My Child's Progress" },
  { k: "speech", i: "🎤", t: "Speech & Pronunciation" },
  { k: "exercises", i: "🧩", t: "Exercises & Scores" },
  { k: "medical", i: "🧠", t: "Medical Insights" },
  { k: "ai", i: "🤖", t: "AI Adaptation" },
  { k: "settings", i: "⚙️", t: "Settings" },
];

const CHILD = { ...AVATARS[0], age: 7, totalWords: 48, exercises: 23, mapPos: 6 };

function Parent() {
  const [tab, setTab] = useState<TabKey>("progress");
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen flex font-pro">
      <aside className={`${open ? "w-64" : "w-20"} bg-white border-r border-border min-h-screen p-4 hidden md:flex flex-col gap-1 sticky top-0 transition-all`}>
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2">
            <Beyond21Logo size={open ? 48 : 36} showText={open} />
            {!open ? null : <span className="sr-only">Beyond 21</span>}
          </Link>
          <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground" aria-label="Toggle sidebar">{open ? "◀" : "▶"}</button>
        </div>
        {TABS.map((n) => (
          <button
            key={n.k}
            onClick={() => setTab(n.k)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${tab === n.k ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/70"}`}
            title={n.t}
          >
            <span className="text-xl">{n.i}</span>{open && <span>{n.t}</span>}
          </button>
        ))}
        <div className="mt-auto pt-6">
          <Link to="/learn" className="block text-center rounded-full bg-mint px-3 py-3 text-sm font-bold text-foreground hover:scale-105 transition">
            🎈 {open && "Open learning hub"}
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-[1400px]">
        <div className="md:hidden mb-6 flex gap-2 overflow-x-auto pb-2">
          {TABS.map((n) => (
            <button key={n.k} onClick={() => setTab(n.k)} className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${tab === n.k ? "bg-primary text-primary-foreground" : "bg-white"}`}>
              {n.i} {n.t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {tab === "progress" && <Progress />}
            {tab === "speech" && <Speech />}
            {tab === "exercises" && <ExercisesTab />}
            {tab === "medical" && <Medical />}
            {tab === "ai" && <AITab />}
            {tab === "settings" && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function H({ t, s }: { t: string; s: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold">{t}</h1>
      <p className="text-muted-foreground mt-1">{s}</p>
    </div>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 40, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" className="-rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
        <text x="55" y="60" textAnchor="middle" className="rotate-90 fill-foreground font-bold text-lg" transform="rotate(90 55 55)">{value}</text>
      </svg>
      <div className="text-sm font-semibold mt-1">{label}</div>
    </div>
  );
}

/* ─── Tab 1: Progress ─── */
function Progress() {
  return (
    <>
      <H t="My Child's Progress" s="Today's journey and overall progress" />
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-soft md:col-span-2 flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-celebrate grid place-items-center text-4xl shadow-soft">{CHILD.emoji}</div>
          <div className="flex-1">
            <div className="font-bold text-2xl">{CHILD.name} <span className="text-sm text-muted-foreground font-normal">· {CHILD.age} years</span></div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-center text-sm">
              <div><div className="text-2xl font-bold text-primary">{CHILD.totalWords}</div><div className="text-muted-foreground">Words learned</div></div>
              <div><div className="text-2xl font-bold text-primary">{CHILD.exercises}</div><div className="text-muted-foreground">Exercises</div></div>
              <div><div className="text-2xl font-bold text-primary">🗺️ {CHILD.mapPos}</div><div className="text-muted-foreground">Map progress</div></div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-celebrate text-white rounded-3xl p-6 shadow-pop">
          <div className="font-semibold opacity-90">Trend</div>
          <div className="text-2xl font-bold mt-1">Getting better! 📈</div>
          <div className="mt-3 flex items-end gap-1 h-16">
            {[30, 45, 40, 55, 60, 70, 78].map((h, i) => (
              <div key={i} className="flex-1 bg-white/30 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-3">Today's activity</h3>
          <ul className="space-y-3 text-sm">
            {[
              { i: "✅", t: "Said «طَيَّارَة» correctly" },
              { i: "🧩", t: "Exercise: 4/5 correct" },
              { i: "🌟", t: "New word learned: كُوجِينَة" },
              { i: "🎉", t: "Earned new sticker: 🦁" },
              { i: "😴", t: "Took a sensory break" },
            ].map((a, i) => (
              <li key={i} className="flex gap-3 items-start"><span className="text-xl">{a.i}</span><span>{a.t}</span></li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-3">Sticker collection 🏅</h3>
          <div className="flex flex-wrap gap-2 text-4xl">
            {["🦁", "🌟", "🍕", "🌈", "🏆", "🦋", "🐠", "🌸", "🚀"].map((s) => (
              <span key={s} className="bg-muted rounded-2xl p-2">{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="font-bold mb-3">Words mastered vs in progress</h3>
        <div className="flex gap-4 mb-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-happy" /> Mastered</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sunny" /> In progress</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> Not started</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {WORDS.map((w, i) => {
            const state = i % 3 === 0 ? "happy" : i % 3 === 1 ? "sunny" : "muted";
            return (
              <div key={w.id} className={`aspect-square rounded-xl grid place-items-center text-3xl border-2 ${state === "happy" ? "border-happy bg-happy/20" : state === "sunny" ? "border-sunny bg-sunny/20" : "border-muted bg-muted"}`} title={w.ar}>
                {w.emoji}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─── Tab 2: Speech ─── */
function Speech() {
  const [showTech, setShowTech] = useState(false);
  return (
    <>
      <H t="Speech & Pronunciation" s="How clearly your child is saying each word" />

      <div className="bg-white rounded-3xl p-6 shadow-soft mb-4">
        <h3 className="font-bold mb-4">Per-word breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr>
                <th className="py-2">Word</th><th>Arabic</th><th>Attempts</th><th>Best</th><th>Confused with</th><th></th>
              </tr>
            </thead>
            <tbody>
              {WORDS.slice(0, 10).map((w, i) => {
                const stars = ((i % 3) + 1);
                const conf = WORDS[(i + 3) % WORDS.length];
                return (
                  <tr key={w.id} className="border-t border-border">
                    <td className="py-3 text-3xl">{w.emoji}</td>
                    <td className="font-arabic text-xl" dir="rtl">{w.ar}</td>
                    <td>{4 + i}</td>
                    <td>{"⭐".repeat(stars)}<span className="opacity-30">{"⭐".repeat(3 - stars)}</span></td>
                    <td className="flex items-center gap-2 py-3"><span className="text-xl">{conf.emoji}</span><span className="font-arabic" dir="rtl">{conf.ar}</span></td>
                    <td><button className="text-primary text-xs font-semibold">▶ Play</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-3">Quality by category</h3>
          {["Animals 🐱", "Food 🍞", "Body 👁️", "Transport 🚗", "Nature 🌙"].map((c, i) => {
            const v = 60 + i * 7;
            return (
              <div key={c} className="mb-3">
                <div className="flex justify-between text-sm mb-1"><span>{c}</span><span className="font-bold">{v}%</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-celebrate" style={{ width: `${v}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-3">Voice setup status</h3>
          <div className="text-sm">
            <div className="flex justify-between mb-2"><span>Words recorded</span><span className="font-bold">20 / 20 ✅</span></div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-3"><div className="h-full bg-happy" style={{ width: "100%" }} /></div>
            <div className="flex justify-between mb-2"><span>Voice quality</span><span className="font-bold">Excellent 🌟</span></div>
            <button className="mt-3 w-full rounded-full bg-mint px-4 py-2 font-bold">Re-record words</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
        <button onClick={() => setShowTech(!showTech)} className="w-full p-6 flex items-center justify-between hover:bg-muted/30">
          <div>
            <h3 className="font-bold">🔧 Technical Details</h3>
            <p className="text-xs text-muted-foreground mt-1">For specialists — ASR metrics</p>
          </div>
          <span>{showTech ? "▲" : "▼"}</span>
        </button>
        {showTech && (
          <div className="px-6 pb-6 grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-muted rounded-2xl p-4"><div className="text-2xl font-bold">34.3%</div><div className="text-muted-foreground">Word Error Rate (WER)</div></div>
            <div className="bg-muted rounded-2xl p-4"><div className="text-2xl font-bold">18.1%</div><div className="text-muted-foreground">Character Error Rate (CER)</div></div>
            <div className="bg-muted rounded-2xl p-4"><div className="text-2xl font-bold">+11%</div><div className="text-muted-foreground">LM rescoring lift</div></div>
            <div className="md:col-span-3 bg-muted rounded-2xl p-4">
              <div className="font-bold mb-2">Top confusion pairs (Levenshtein + LM)</div>
              <table className="w-full text-xs font-mono">
                <thead><tr className="text-muted-foreground"><th className="text-left">Said</th><th className="text-left">Meant</th><th className="text-right">Count</th></tr></thead>
                <tbody>
                  {[["taara","tayyara",12],["sayyara","tayyara",7],["kelb","kalb",5]].map((r,i)=>(
                    <tr key={i}><td>{r[0]}</td><td className="text-primary">{r[1]}</td><td className="text-right">{r[2]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Tab 3: Exercises ─── */
function ExercisesTab() {
  const cog = [
    { l: "Attention", v: 70, c: "var(--sky)" },
    { l: "Memory", v: 74, c: "var(--happy)" },
    { l: "Language", v: 71, c: "var(--bubble)" },
    { l: "Motor", v: 75, c: "var(--peach)" },
  ];
  const overall = Math.round(cog.reduce((s, x) => s + x.v, 0) / cog.length);
  return (
    <>
      <H t="Exercises & Scores" s="Performance across cognitive dimensions" />

      <div className="bg-white rounded-3xl p-6 shadow-soft mb-4">
        <h3 className="font-bold mb-4">Cognitive scores</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
          {cog.map((g) => <Gauge key={g.l} label={g.l} value={g.v} color={g.c} />)}
        </div>
        <div className="mt-6 rounded-2xl bg-gradient-celebrate text-white p-5 text-center">
          <div className="text-sm opacity-90">Overall Cognitive Score</div>
          <div className="text-4xl font-bold">{overall} / 100</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-3">Exercise history</h3>
          <ul className="space-y-2 text-sm">
            {[
              { d: "Today 10:24", t: "Which picture?", s: "⭐⭐⭐", p: "100%", time: "3:12" },
              { d: "Today 09:50", t: "Match the pairs", s: "⭐⭐", p: "75%", time: "4:40" },
              { d: "Yesterday", t: "Listen and repeat", s: "⭐⭐⭐", p: "90%", time: "2:50" },
              { d: "Yesterday", t: "What is this?", s: "⭐⭐", p: "70%", time: "5:10" },
            ].map((e, i) => (
              <li key={i} className="border-t border-border pt-2 flex justify-between gap-2">
                <div><div className="font-semibold">{e.t}</div><div className="text-xs text-muted-foreground">{e.d} · {e.time}</div></div>
                <div className="text-right"><div>{e.s}</div><div className="text-xs text-muted-foreground">{e.p}</div></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-3">Trends (last 4 weeks)</h3>
          <div className="space-y-3">
            {cog.map((g) => (
              <div key={g.l}>
                <div className="flex justify-between text-sm mb-1"><span>{g.l}</span><span className="text-primary">↑ {g.v}</span></div>
                <svg viewBox="0 0 100 24" className="w-full h-6">
                  <polyline fill="none" stroke={g.c} strokeWidth="2" points={`0,${24 - g.v / 5} 25,${22 - g.v / 5} 50,${20 - g.v / 5} 75,${18 - g.v / 5} 100,${16 - g.v / 5}`} />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <h3 className="font-bold mb-3">Strengths & focus areas</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-happy/30 p-4">💪 <strong>Strong in Motor skills</strong> — keep playing matching games!</div>
          <div className="rounded-2xl bg-sunny/30 p-4">📖 <strong>Practice Language</strong> — try more "Listen and repeat".</div>
        </div>
      </div>
    </>
  );
}

/* ─── Tab 4: Medical ─── */
function Medical() {
  const cog = [
    { l: "Attention", v: 70, c: "var(--sky)" },
    { l: "Memory", v: 74, c: "var(--happy)" },
    { l: "Language", v: 71, c: "var(--bubble)" },
    { l: "Motor", v: 75, c: "var(--peach)" },
  ];
  const overall = 73;
  const risk = 22; // %
  return (
    <>
      <H t="Medical Insights" s="Brain analysis & clinical indicators" />

      <div className="space-y-4">
        {/* Card 1 */}
        <div className="bg-white rounded-3xl p-6 shadow-soft grid md:grid-cols-[200px_1fr] gap-6 items-center">
          <div className="aspect-square rounded-full bg-gradient-to-br from-sky/40 to-bubble/40 grid place-items-center text-7xl">🧠</div>
          <div>
            <h3 className="font-bold text-lg">Brain Visualization</h3>
            <div className="inline-flex items-center gap-2 mt-2 rounded-full bg-happy/40 px-3 py-1 text-sm font-bold">✅ No Anomaly Detected</div>
            <div className="mt-3 text-xs text-muted-foreground mb-1">Detection confidence</div>
            <div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-purple-500" style={{ width: "92%" }} /></div>
            <div className="text-xs mt-1 font-bold">92%</div>
            <p className="text-sm text-muted-foreground mt-2">No anomalies detected in the latest scan.</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-4">Cognitive Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
            {cog.map((g) => <Gauge key={g.l} label={g.l} value={g.v} color={g.c} />)}
          </div>
          <div className="mt-6 rounded-2xl bg-gradient-celebrate text-white p-5 text-center">
            <div className="text-sm opacity-90">Overall Cognitive Score</div>
            <div className="text-4xl font-bold">{overall} / 100</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Alzheimer Risk Indicator</h3>
            <span className="rounded-full bg-happy/40 px-3 py-1 text-sm font-bold">Low Risk</span>
          </div>
          <div className="relative h-5 rounded-full" style={{ background: "linear-gradient(to right, #86efac, #fde047, #fca5a5)" }}>
            <div className="absolute -top-1 w-7 h-7 rounded-full bg-white border-4 border-foreground" style={{ left: `calc(${risk}% - 14px)` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs font-semibold text-muted-foreground">
            <span>Low</span><span>Moderate</span><span>Elevated</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-3xl p-6 shadow-soft grid md:grid-cols-[1fr_180px] gap-6">
          <div>
            <h3 className="font-bold mb-3">Anomaly Map</h3>
            <div className="aspect-video rounded-2xl relative overflow-hidden grid place-items-center" style={{ background: "radial-gradient(circle at 30% 40%, #fde047 0%, transparent 30%), radial-gradient(circle at 65% 55%, #f87171 0%, transparent 25%), linear-gradient(135deg, #1e293b, #475569)" }}>
              <span className="text-7xl opacity-40">🧠</span>
            </div>
            <div className="mt-3 text-sm">Anomaly score: <span className="font-bold">0.18</span> <span className="text-muted-foreground">(Low intensity)</span></div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-2">Intensity</div>
            <div className="h-40 w-6 rounded-full" style={{ background: "linear-gradient(to top, #fef9c3, #fde047, #f97316, #dc2626)" }} />
            <div className="text-xs mt-2 text-muted-foreground">Low → High</div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-3">GradCAM XAI Explainability</h3>
          <div className="aspect-video rounded-2xl relative overflow-hidden grid place-items-center" style={{ background: "radial-gradient(circle at 55% 50%, #ef4444 0%, #f97316 8%, #fde047 16%, #4ade80 24%, #22d3ee 32%, #3b82f6 40%, transparent 50%), linear-gradient(135deg, #1e293b, #475569)" }}>
            <span className="text-7xl opacity-30">🧠</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">The model focused on the <strong>temporal lobe region</strong>, which is associated with language processing.</p>
        </div>
      </div>
    </>
  );
}

/* ─── Tab 6: Settings ─── */
function SettingsTab() {
  const [url, setUrl] = useState(getApiUrl());
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");

  useEffect(() => {
    if (getApiUrl()) {
      setStatus("checking");
      checkHealth().then((ok) => setStatus(ok ? "connected" : "error"));
    }
  }, []);

  async function handleSave() {
    setApiUrl(url);
    setStatus("checking");
    const ok = await checkHealth();
    setStatus(ok ? "connected" : "error");
  }

  return (
    <>
      <H t="Settings" s="Connect to the ASR backend (Colab)" />
      <div className="bg-white rounded-3xl p-6 shadow-soft max-w-xl">
        <h3 className="font-bold mb-4">🔗 API Connection</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Paste the ngrok URL from your Colab notebook (Notebook 09) here.
          The app will use this to send audio for speech recognition and pronunciation scoring.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxx-xx-xx.ngrok-free.app"
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSave}
            className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-bold hover:scale-105 transition"
          >
            Save
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {status === "idle" && <span className="text-sm text-muted-foreground">Not configured yet</span>}
          {status === "checking" && <span className="text-sm text-muted-foreground">⏳ Checking connection...</span>}
          {status === "connected" && <span className="text-sm text-green-600 font-bold">✅ Connected — API is running!</span>}
          {status === "error" && <span className="text-sm text-red-600 font-bold">❌ Cannot reach API — check if Colab is running</span>}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft max-w-xl mt-4">
        <h3 className="font-bold mb-3">📋 How to connect</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Open <strong>Notebook 09</strong> on Google Colab</li>
          <li>Run all cells (models load in ~3 minutes)</li>
          <li>Copy the <strong>ngrok URL</strong> printed in the last cell</li>
          <li>Paste it above and click Save</li>
          <li>The app is now connected to your ASR pipeline!</li>
        </ol>
      </div>
    </>
  );
}

/* ─── Tab 5: AI Adaptation ─── */
function AITab() {
  const s = useAdaptive();
  const [breakSens, setBreakSens] = useState(60);
  const [diffSens, setDiffSens] = useState(70);

  const bars = [
    { k: "Focus Ratio", v: Math.round(s.focus), invert: false },
    { k: "Movement Intensity", v: Math.round(s.movement), invert: true },
    { k: "Frustration Level", v: Math.round(s.frustration), invert: true },
    { k: "Error Rate", v: Math.round(s.errorRate), invert: true },
  ];

  return (
    <>
      <H t="AI Adaptation" s="Behind-the-scenes Adaptive Learning Controller" />

      <div className="bg-foreground text-background rounded-3xl p-5 shadow-pop mb-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-bubble/30 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="text-3xl animate-breathe">🤖</span>
          <div>
            <div className="text-xs opacity-70">Live status · session active</div>
            <div className="font-bold text-lg">{s.decision.icon} {s.decision.text}</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT — Live Sensor Feed */}
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-4">📡 Live Features</h3>
          <div className="space-y-4">
            {bars.map((b) => {
              const color = colorForScore(b.v, b.invert);
              return (
                <div key={b.k}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">{b.k}</span>
                    <span className="font-bold" style={{ color }}>{b.v}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: `${b.v}%`, backgroundColor: color }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-muted p-3">
              <div className="text-2xl font-bold">{s.hesitations}</div>
              <div className="text-xs text-muted-foreground">Total hesitations</div>
            </div>
            <div className="rounded-2xl bg-muted p-3">
              <div className="text-2xl font-bold">{(s.avgResponseMs / 1000).toFixed(1)}s</div>
              <div className="text-xs text-muted-foreground">Avg response time</div>
            </div>
          </div>
        </div>

        {/* CENTER — Neutrosophic Brain */}
        <div className="bg-white rounded-3xl p-6 shadow-soft">
          <h3 className="font-bold mb-4">🧠 Neutrosophic Logic</h3>
          <div className="grid grid-cols-3 gap-2 justify-items-center">
            <Gauge label="T (Truth)" value={Math.round(s.T * 100)} color="var(--happy)" />
            <Gauge label="I (Indet.)" value={Math.round(s.I * 100)} color="var(--sunny)" />
            <Gauge label="F (False)" value={Math.round(s.F * 100)} color="var(--peach)" />
          </div>
          <div className="mt-6 text-center">
            <motion.div
              className="text-6xl mx-auto"
              animate={{ scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 0px var(--primary))", "drop-shadow(0 0 18px var(--primary))", "drop-shadow(0 0 0px var(--primary))"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >🧠</motion.div>
            <div className="mt-3 rounded-2xl bg-gradient-celebrate text-white p-4">
              <div className="text-xs opacity-90">Current AI decision</div>
              <div className="font-bold text-lg mt-1">{s.decision.icon} {s.decision.text}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <div className="flex justify-between mb-1"><span>Sensory break sensitivity</span><span className="font-bold">{breakSens}%</span></div>
              <input type="range" min={0} max={100} value={breakSens} onChange={(e) => setBreakSens(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Difficulty adapt speed</span><span className="font-bold">{diffSens}%</span></div>
              <input type="range" min={0} max={100} value={diffSens} onChange={(e) => setDiffSens(Number(e.target.value))} className="w-full" />
            </div>
          </div>
        </div>

        {/* RIGHT — Session Log */}
        <div className="bg-white rounded-3xl p-6 shadow-soft flex flex-col">
          <h3 className="font-bold mb-4">📝 Session Log</h3>
          <div className="flex-1 max-h-[460px] overflow-y-auto pr-2 space-y-2 text-sm">
            <AnimatePresence initial={false}>
              {s.log.map((entry) => (
                <motion.div
                  key={entry.ts}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 items-start border-b border-border/60 pb-2 last:border-0"
                >
                  <span className="text-lg">{entry.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium leading-snug">{entry.text}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {new Date(entry.ts).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
