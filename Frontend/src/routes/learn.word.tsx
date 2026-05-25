import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { WORDS, loadAllWords, type Word } from "@/data/words";
import { Mascot } from "@/components/Mascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import { AudioRecorder } from "@/lib/recorder";
import { pronounce, getAsrUrl, playReferenceAudio } from "@/lib/api";
import { activityStore } from "@/lib/activityStore";

function speakToChild(text: string, lang = "ar-TN") {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
}

export const Route = createFileRoute("/learn/word")({
  head: () => ({ meta: [{ title: "Learn a Word — Beyond 21" }] }),
  component: LearnWord,
});

type Status = "idle" | "listening" | "processing" | "correct" | "incorrect";

function LearnWord() {
  const [words, setWords] = useState<Word[]>(WORDS);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [stars, setStars] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [quality, setQuality] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [phonemeScores, setPhonemeScores] = useState<Array<{ arabic: string; stars: number }>>([]);
  const recorderRef = useRef(new AudioRecorder());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const word = words[idx];

  useEffect(() => {
    loadAllWords().then(setWords);
  }, []);

  function stopAllAudio() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function later(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }

  function playReference() {
    stopAllAudio();
    if (getAsrUrl()) {
      playReferenceAudio(word.ar).catch(() => {
        fallbackSpeak(word.ar);
      });
    } else {
      fallbackSpeak(word.ar);
    }
  }

  function fallbackSpeak(text: string) {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ar-TN";
      window.speechSynthesis.speak(u);
    }
  }

  async function handleMic() {
    if (!getAsrUrl()) {
      alert("Please set the API URL first.\nGo to the Parent Dashboard → Settings tab.");
      return;
    }

    stopAllAudio();
    setStatus("listening");
    setFeedback("");
    setPhonemeScores([]);

    try {
      await recorderRef.current.start();

      later(async () => {
        const audioBlob = await recorderRef.current.stop();
        setStatus("processing");

        try {
          const result = await pronounce(audioBlob, word.ar);

          if (result.error) {
            setStatus("idle");
            setFeedback(`Server error: ${result.error}`);
            return;
          }

          if (result.passed) {
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 },
              colors: ["#A3D2CA", "#F7D1BA", "#F4A4C0", "#FFD93D"],
            });
            setStatus("correct");
            setStars((s) => s + 1);
            setQuality(3);
            setFeedback(result.feedback || "");
            setPhonemeScores(result.phoneme_scores!.map((p) => ({ arabic: p.arabic, stars: p.stars })));
            activityStore.recordPronunciation({
              wordId: word.id, wordAr: word.ar, emoji: word.emoji,
              passed: true, overallScore: result.overall_score || 100,
              phonemeScores: result.phoneme_scores!.map((p) => ({ arabic: p.arabic, stars: p.stars })),
            });
            speakToChild("برافو! ممتاز!", "ar");
            later(next, 4000);
          } else {
            const avgStars = Math.round((result.overall_score || 0) / 33);
            setQuality(Math.max(1, Math.min(3, avgStars)));
            setAttempts((a) => a + 1);
            setStatus("incorrect");
            setFeedback(result.feedback || "");
            setPhonemeScores(result.phoneme_scores!.map((p) => ({ arabic: p.arabic, stars: p.stars })));
            activityStore.recordPronunciation({
              wordId: word.id, wordAr: word.ar, emoji: word.emoji,
              passed: false, overallScore: result.overall_score || 0,
              phonemeScores: result.phoneme_scores!.map((p) => ({ arabic: p.arabic, stars: p.stars })),
            });

            later(async () => {
              speakToChild("حاول مرة أخرى، اسمع", "ar");
              later(async () => {
                await playReferenceAudio(word.ar).catch(() => {});
              }, 2000);
            }, 500);

            if (attempts >= 2) {
              later(() => {
                stopAllAudio();
                speakToChild("يلا نجربو كلمة أخرى", "ar");
                later(() => {
                  setStatus("idle");
                  next();
                }, 2000);
              }, 6000);
            }
          }
        } catch (err) {
          setStatus("idle");
          setFeedback("Connection error — check if Colab is running");
        }
      }, 3000);
    } catch {
      setStatus("idle");
      setFeedback("Microphone access denied");
    }
  }

  function next() {
    stopAllAudio();
    setStatus("idle");
    setAttempts(0);
    setQuality(3);
    setFeedback("");
    setPhonemeScores([]);
    setIdx((i) => (i + 1) % words.length);
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/learn" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Back">⬅️</Link>
        <div className="bg-white/80 backdrop-blur rounded-full px-5 py-2 shadow-soft font-bold flex items-center gap-2">
          <span className="text-2xl">📖</span><span>Learn a Word</span>
        </div>
        <Link to="/" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Home">🏠</Link>
      </div>
      <div className="relative z-10 text-center mt-2">
        <p className="text-lg font-bold text-foreground/70">Listen, say it & earn stars! 🌟</p>
      </div>

      <section className="relative z-10 max-w-2xl mx-auto px-6 mt-4" dir="rtl">
        <AnimatePresence mode="wait">
          <motion.div
            key={word.id + status}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.4 }}
            className="rounded-[3rem] bg-white shadow-pop p-8 md:p-12 text-center relative overflow-hidden"
          >
            <div className={`absolute inset-0 transition-opacity ${status === "correct" ? "bg-happy/40 opacity-100" : "bg-gradient-celebrate opacity-10"}`} aria-hidden />
            <motion.div
              animate={status === "correct" ? { scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] } : { y: [0, -8, 0] }}
              transition={status === "correct" ? { duration: 0.7 } : { duration: 3, repeat: Infinity }}
              className="text-[10rem] md:text-[14rem] leading-none relative"
            >
              {word.emoji}
            </motion.div>
            <div className="font-arabic text-5xl md:text-7xl font-black mt-4 tracking-wider relative">{word.ar}</div>
            <button onClick={playReference} className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky text-white px-6 py-3 shadow-soft hover:scale-110 active:scale-95 transition relative animate-bob" aria-label="Hear the word">
              <span className="text-2xl">🔊</span>
            </button>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="relative">
            {status === "listening" && (
              <>
                <span className="absolute inset-0 rounded-full bg-bubble animate-ripple" />
                <span className="absolute inset-0 rounded-full bg-mint animate-ripple" style={{ animationDelay: "0.3s" }} />
                {["⭐", "💖", "🌈"].map((e, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-3xl"
                    animate={{ y: [-30, -80, -30], x: [(i - 1) * 30, (i - 1) * 50, (i - 1) * 30], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                    style={{ left: "50%", top: "0" }}
                  >{e}</motion.span>
                ))}
              </>
            )}
            <button
              onClick={handleMic}
              disabled={status === "processing" || status === "listening"}
              aria-label="Tap to speak"
              className="relative w-32 h-32 rounded-full bg-gradient-celebrate text-white text-5xl shadow-pop grid place-items-center hover:scale-110 active:scale-95 transition animate-breathe disabled:animate-none"
            >
              {status === "processing" ? "🎧" : "🎤"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center min-h-16">
              {status === "idle" && <div className="text-foreground/70 font-semibold">Tap the mic and say it! 🎤</div>}
              {status === "listening" && <div className="text-2xl font-bold">I'm listening… 🌈</div>}
              {status === "processing" && <div className="text-2xl font-bold">🎧 Checking your pronunciation…</div>}
              {status === "correct" && (
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">🎉 Perfect! ⭐</div>
                  {phonemeScores.length > 0 && (
                    <div className="flex justify-center gap-2 flex-wrap">
                      {phonemeScores.map((p, i) => (
                        <span key={i} className="bg-green-100 rounded-full px-3 py-1 text-lg font-bold">
                          {p.arabic} {"⭐".repeat(p.stars)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {status === "incorrect" && (
                <div className="space-y-3">
                  <div className="text-2xl font-bold">🤔 Almost! Listen and try again 👇</div>
                  <div className="flex justify-center gap-1 text-3xl">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className={s <= quality ? "" : "grayscale opacity-30"}>⭐</span>
                    ))}
                  </div>
                  {phonemeScores.length > 0 && (
                    <div className="flex justify-center gap-3 flex-wrap">
                      {phonemeScores.map((p, i) => (
                        <motion.span
                          key={i}
                          animate={p.stars < 2 ? { scale: [1, 1.3, 1] } : {}}
                          transition={{ duration: 1, repeat: Infinity }}
                          className={`rounded-2xl px-4 py-2 text-2xl font-bold ${p.stars >= 3 ? "bg-green-200 border-2 border-green-400" : p.stars >= 2 ? "bg-yellow-200 border-2 border-yellow-400" : "bg-red-200 border-2 border-red-400 animate-pulse"}`}
                        >
                          {p.arabic}
                        </motion.span>
                      ))}
                    </div>
                  )}
                  <button onClick={playReference} className="rounded-full bg-sky text-white px-6 py-3 text-xl font-bold shadow-soft hover:scale-105 transition">
                    🔊 Listen again
                  </button>
                  {attempts < 3 && (
                    <button onClick={() => setStatus("idle")} className="rounded-full bg-sunny px-8 py-4 text-xl font-bold shadow-soft hover:scale-105 transition animate-bob">
                      🎤 Try again!
                    </button>
                  )}
                  {attempts >= 3 && <div className="text-xl font-bold mt-2">🌟 Great effort! Next word!</div>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <div className="fixed bottom-6 left-6 z-20">
        <Mascot mood={status === "correct" ? "celebrate" : status === "processing" ? "thinking" : status === "incorrect" ? "thinking" : "idle"} size={110} />
      </div>

      <div className="fixed bottom-6 right-6 z-20 bg-white rounded-full px-5 py-3 shadow-pop flex items-center gap-2">
        <span className="text-2xl">⭐</span><span className="font-bold text-xl">{stars}</span>
      </div>
    </main>
  );
}
