import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/Mascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import { AudioRecorder } from "@/lib/recorder";
import { getApiUrl, transcribe } from "@/lib/api";

export const Route = createFileRoute("/learn/talk")({
  head: () => ({ meta: [{ title: "Free Talk — Beyond 21" }] }),
  component: FreeTalk,
});

type Status = "idle" | "listening" | "processing" | "result" | "error";

function speakToChild(text: string, lang = "ar") {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
}

function FreeTalk() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{
    recognized: string;
    whisper_raw: string;
    in_vocabulary: boolean;
    all_candidates: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ text: string; time: string }>>([]);
  const recorderRef = useRef(new AudioRecorder());

  async function handleMic() {
    if (!getApiUrl()) {
      alert("Please set the API URL first.\nGo to the Parent Dashboard → Settings tab.");
      return;
    }

    setStatus("listening");
    setResult(null);
    setError(null);

    try {
      await recorderRef.current.start();

      setTimeout(async () => {
        const audioBlob = await recorderRef.current.stop();
        console.log("[Talk] Recording done, blob size:", audioBlob.size);
        setStatus("processing");

        try {
          const res = await transcribe(audioBlob);
          console.log("[Talk] Transcribe result:", res);
          setStatus("result");
          setResult({
            recognized: res.recognized,
            whisper_raw: res.whisper_raw,
            in_vocabulary: res.in_vocabulary,
            all_candidates: res.all_candidates,
          });
          setHistory((h) => [
            { text: res.recognized, time: new Date().toLocaleTimeString() },
            ...h.slice(0, 9),
          ]);
          speakToChild(`سمعتك تقول: ${res.recognized}`);
        } catch (err) {
          console.error("[Talk] Transcribe error:", err);
          setStatus("error");
          setError(err instanceof Error ? err.message : "Transcription failed");
        }
      }, 4000);
    } catch {
      setStatus("idle");
      alert("Microphone access denied");
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/learn" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Back">⬅️</Link>
        <div className="bg-white/80 backdrop-blur rounded-full px-5 py-2 shadow-soft font-bold flex items-center gap-2">
          <span className="text-2xl">🗣️</span><span>Free Talk</span>
        </div>
        <Link to="/" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Home">🏠</Link>
      </div>

      <section className="relative z-10 max-w-2xl mx-auto px-6 mt-8">
        <div className="text-center mb-8">
          <Mascot mood={status === "result" ? "celebrate" : status === "processing" ? "thinking" : "idle"} size={130} />
          <AnimatePresence mode="wait">
            <motion.div key={status} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {status === "idle" && <p className="text-2xl font-bold mt-4">Say anything! I'll understand 🎧</p>}
              {status === "listening" && <p className="text-2xl font-bold mt-4 animate-pulse">I'm listening... 👂</p>}
              {status === "processing" && <p className="text-2xl font-bold mt-4">Thinking... 🧠</p>}
              {status === "error" && (
                <div className="mt-4 space-y-2">
                  <p className="text-2xl font-bold text-red-500">Oops! Something went wrong</p>
                  <p className="text-sm text-red-400">{error}</p>
                  <button onClick={() => { setStatus("idle"); setError(null); }} className="mt-2 rounded-full bg-sunny px-6 py-3 text-lg font-bold shadow-soft hover:scale-105 transition">
                    Try again
                  </button>
                </div>
              )}
              {status === "result" && result && (
                <div className="mt-4 space-y-3">
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="bg-white rounded-[2rem] p-8 shadow-pop"
                  >
                    <p className="text-sm text-muted-foreground mb-2">I heard you say:</p>
                    <p className="font-arabic text-5xl font-black" dir="rtl">{result.recognized}</p>
                    {result.whisper_raw !== result.recognized && (
                      <p className="text-sm text-muted-foreground mt-3" dir="rtl">
                        (raw: {result.whisper_raw})
                      </p>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center">
          <div className="relative">
            {status === "listening" && (
              <>
                <span className="absolute inset-0 rounded-full bg-bubble animate-ripple" />
                <span className="absolute inset-0 rounded-full bg-mint animate-ripple" style={{ animationDelay: "0.3s" }} />
              </>
            )}
            <button
              onClick={handleMic}
              disabled={status === "processing" || status === "listening" || status === "error"}
              aria-label="Tap to speak"
              className="relative w-36 h-36 rounded-full bg-gradient-to-br from-sky to-bubble text-white text-6xl shadow-pop grid place-items-center hover:scale-110 active:scale-95 transition disabled:animate-pulse"
            >
              {status === "processing" ? "🧠" : status === "listening" ? "👂" : "🎤"}
            </button>
          </div>
        </div>

        {status === "result" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-6">
            <button
              onClick={() => { setStatus("idle"); setResult(null); }}
              className="rounded-full bg-sunny px-8 py-4 text-xl font-bold shadow-soft hover:scale-105 transition"
            >
              🎤 Say something else!
            </button>
          </motion.div>
        )}

        {history.length > 0 && (
          <div className="mt-10 bg-white/80 backdrop-blur rounded-3xl p-6 shadow-soft">
            <h3 className="font-bold text-lg mb-3">Recent words:</h3>
            <div className="space-y-2" dir="rtl">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-2 shadow-sm">
                  <span className="font-arabic text-xl font-bold">{h.text}</span>
                  <span className="text-xs text-muted-foreground">{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
