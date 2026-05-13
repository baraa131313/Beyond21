import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Mascot } from "@/components/Mascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import { getApiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  runFullPipeline,
  base64ToImageSrc,
  type FullPipelineResponse,
} from "@/lib/imageService";

export const Route = createFileRoute("/learn/picture")({
  head: () => ({ meta: [{ title: "Show Me a Picture – Beyond 21" }] }),
  component: Picture,
});

type Status = "idle" | "listening" | "processing" | "result" | "fail";

// ── Helper style bouton score ─────────────────────────────────────────────────
function scoreBtn(current: number | null, value: number): string {
  const base =
    "flex-1 py-2 rounded-xl text-sm font-semibold transition hover:scale-105 border-2 ";
  if (current === value)
    return base + "border-indigo-400 bg-indigo-100 text-indigo-800 scale-105";
  return base + "border-gray-200 bg-white text-gray-600 hover:border-gray-300";
}

// ── Composant principal ───────────────────────────────────────────────────────
function Picture() {
  const { child } = useAuth();

  const [childId, setChildId] = useState<string>("child_001");
  const [status, setStatus] = useState<Status>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<FullPipelineResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // ── etats feedback 3 dimensions ──────────────────────────────────────────
  const [quality, setQuality] = useState<number | null>(null);
  const [clarity, setClarity] = useState<number | null>(null);
  const [styleScore, setStyleScore] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (child) setChildId(`child_${child.id}`);
  }, [child]);

  // ── Enregistrement ────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  "https://interactive-learning-platform-production-3b22.up.railway.app";

async function handleMic() {
  // Supprime le check getApiUrl() — on utilise Railway directement
  if (!isRecording) {
    try {
      setStatus("listening");
      setResult(null);
      setFeedbackSent(false);
      setQuality(null);
      setClarity(null);
      setStyleScore(null);
      setIsRecording(true);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        await processPipeline();
      };
      recorder.start();
    } catch {
      setStatus("fail");
      setErrorMsg("Microphone inaccessible.");
      setIsRecording(false);
    }
  } else {
    mediaRecorderRef.current?.stop();
  }
}
  // ── Pipeline audio → image ────────────────────────────────────────────────
  async function processPipeline() {
    setStatus("processing");
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      const form = new FormData();
      form.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: "POST",
        body: form,
        headers: { "ngrok-skip-browser-warning": "true" },
      });

      if (!transcribeRes.ok)
        throw new Error(`Transcription echouee : ${transcribeRes.status}`);

      const { transcription } = await transcribeRes.json();

      if (!transcription?.trim())
        throw new Error("Transcription vide — reessaie.");

      const pipelineResult = await runFullPipeline(transcription, childId);

      setResult(pipelineResult);
      setStatus("result");
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("fail");
    }
  }

  // ── Envoi feedback ────────────────────────────────────────────────────────
  async function handleFeedback() {
    if (!result || feedbackSent || !quality || !clarity || !styleScore) return;
    setFeedbackSent(true);

    const base = getApiUrl();
    await fetch(`${base}/api/pipeline/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        child_id: childId,
        transcription: result.transcription,
        translation: result.english,
        prompt: result.prompt,
        quality_score: quality,
        clarity_score: clarity,
        style_score: styleScore,
      }),
    }).catch(() => {});

    if (quality === 3) confetti({ particleCount: 120, spread: 100 });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function reset() {
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setFeedbackSent(false);
    setQuality(null);
    setClarity(null);
    setStyleScore(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/learn" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Back">⬅️</Link>
        <div className="bg-white/80 backdrop-blur rounded-full px-5 py-2 shadow-soft font-bold flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <span>Show Me a Picture</span>
        </div>
        <Link to="/" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Home">🏠</Link>
      </div>

      <section className="relative z-10 max-w-2xl mx-auto px-6 mt-6 text-center pb-16">

        {status === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Mascot size={140} />
            <div className="mt-6 flex items-center justify-center gap-4 text-5xl">
              <span>💬</span><span className="text-3xl">→</span>
              <span>🎤</span><span className="text-3xl">→</span>
              <span>🖼️</span>
            </div>
            <p className="mt-4 text-2xl font-bold">Dis quelque chose ! 🎤</p>
            <p className="text-muted-foreground mt-1">Parle en dialecte tunisien</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {status === "listening" && (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
              <div className="text-2xl font-bold">J'ecoute… 🌈</div>
              <p className="text-muted-foreground mt-2">Appuie a nouveau pour arrêter</p>
            </motion.div>
          )}

          {status === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
              <div className="relative inline-block">
                <Mascot mood="thinking" size={140} />
                <motion.div className="absolute -top-4 -right-4 text-5xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>💡</motion.div>
              </div>
              <p className="mt-4 text-xl font-bold">Je genere ton image… 🎨</p>
              <p className="text-muted-foreground text-sm mt-1">Transcription → Traduction → Generation (~20s)</p>
            </motion.div>
          )}

          {status === "result" && result && (
            <motion.div
              key="result"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="rounded-[3rem] bg-white shadow-pop p-6"
            >
              <motion.img
                src={base64ToImageSrc(result.image_b64)}
                alt={result.english}
                className="w-full rounded-2xl shadow-soft"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              />

              <div className="mt-4 space-y-1 text-right" dir="rtl">
                <p className="font-arabic text-3xl font-bold">{result.transcription}</p>
                <p className="text-muted-foreground text-sm">{result.french}</p>
              </div>

              {/* ── Feedback 3 dimensions ── */}
              {!feedbackSent ? (
                <div className="mt-5 space-y-4 text-left">

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">😊 Tu as aime l'image ?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setQuality(1)} className={scoreBtn(quality, 1)}>👎 Non</button>
                      <button onClick={() => setQuality(2)} className={scoreBtn(quality, 2)}>😐 Moyen</button>
                      <button onClick={() => setQuality(3)} className={scoreBtn(quality, 3)}>👍 Oui !</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">🧠 Tu comprends ce que tu vois ?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setClarity(1)} className={scoreBtn(clarity, 1)}>❌ Complexe</button>
                      <button onClick={() => setClarity(3)} className={scoreBtn(clarity, 3)}>✅ Clair !</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">🎨 Les couleurs te plaisent ?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setStyleScore(1)} className={scoreBtn(styleScore, 1)}>😕 Non</button>
                      <button onClick={() => setStyleScore(2)} className={scoreBtn(styleScore, 2)}>🙂 Bien</button>
                      <button onClick={() => setStyleScore(3)} className={scoreBtn(styleScore, 3)}>❤️ Parfait</button>
                    </div>
                  </div>

                  {quality && clarity && styleScore && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleFeedback}
                      className="w-full rounded-full bg-indigo-500 text-white py-3 font-bold hover:scale-105 transition shadow-soft"
                    >
                      ✅ Envoyer mon avis
                    </motion.button>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-green-600 font-semibold text-center">✅ Merci pour ton retour !</p>
              )}

              <button onClick={reset} className="mt-4 w-full rounded-full bg-gradient-to-r from-mint to-happy text-white py-3 font-bold text-lg shadow-soft hover:scale-105 transition">
                🎤 Essaie autre chose !
              </button>
            </motion.div>
          )}

          {status === "fail" && (
            <motion.div key="fail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[3rem] p-10 shadow-pop">
              <div className="text-7xl">🤷</div>
              <p className="mt-4 text-xl font-bold">Oups ! {errorMsg || "Reessaie 💛"}</p>
              <button onClick={reset} className="mt-4 rounded-full bg-sunny px-8 py-4 text-xl font-bold shadow-soft hover:scale-105 transition">🔄 Reessayer</button>
            </motion.div>
          )}

        </AnimatePresence>

        {(status === "idle" || status === "listening") && (
          <div className="mt-10 flex justify-center">
            <div className="relative">
              {status === "listening" && (
                <>
                  <span className="absolute inset-0 rounded-full bg-bubble animate-ripple" />
                  <span className="absolute inset-0 rounded-full bg-mint animate-ripple" style={{ animationDelay: "0.3s" }} />
                </>
              )}
              <button
                onClick={handleMic}
                aria-label={isRecording ? "Arrêter" : "Parler"}
                className="relative w-32 h-32 rounded-full bg-gradient-celebrate text-white text-5xl shadow-pop grid place-items-center hover:scale-110 active:scale-95 transition animate-breathe"
              >
                {isRecording ? "⏹️" : "🎤"}
              </button>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}