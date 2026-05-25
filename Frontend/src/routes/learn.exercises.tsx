import { createFileRoute, Link } from "@tanstack/react-router";
import { Mascot } from "@/components/Mascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import QuizSession from "@/components/QuizSession";

export const Route = createFileRoute("/learn/exercises")({
  head: () => ({ meta: [{ title: "Exercises — Beyond 21" }] }),
  component: Exercises,
});

function Exercises() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <div className="relative z-10 flex items-center justify-between px-6 py-2">
        <Link to="/learn" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Back">⬅️</Link>
        <div className="bg-white/80 backdrop-blur rounded-full px-5 py-2 shadow-soft font-bold flex items-center gap-2">
          <span className="text-2xl">🧩</span><span>Exercises</span>
        </div>
        <Link to="/" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Home">🏠</Link>
      </div>

      <section className="relative z-10 max-w-7xl mx-auto px-4 mt-2 pb-8">
        <QuizSession onFinish={() => window.history.back()} />
      </section>
    </main>
  );
}
