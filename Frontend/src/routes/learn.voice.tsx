import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { WORDS, loadAllWords, type Word } from "@/data/words";
import { Mascot } from "@/components/Mascot";
import { FloatingBackground } from "@/components/FloatingBackground";
import { AudioRecorder } from "@/lib/recorder";
import { getAsrUrl, playReferenceAudio, startTraining, getTrainingStatus } from "@/lib/api";

export const Route = createFileRoute("/learn/voice")({
  head: () => ({ meta: [{ title: "My Voice — Beyond 21" }] }),
  component: Voice,
});

const TARGET = 20;

async function enrollAudio(audioBlob: Blob, word: string, speakerId: string) {
  const base = getAsrUrl();
  if (!base) return;
  const form = new FormData();
  form.append("audio", audioBlob, "recording.wav");
  form.append("word", word);
  form.append("speaker_id", speakerId);
  await fetch(`${base}/api/enroll`, {
    method: "POST",
    body: form,
    headers: { "ngrok-skip-browser-warning": "true" },
  });
}

function playReference(word: string) {
  if (getAsrUrl()) {
    playReferenceAudio(word).catch(() => {
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(word);
        u.lang = "ar-TN";
        window.speechSynthesis.speak(u);
      }
    });
  } else if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "ar-TN";
    window.speechSynthesis.speak(u);
  }
}

function Voice() {
  const [allWords, setAllWords] = useState<Word[]>(WORDS);
  const items = allWords.concat(allWords).slice(0, TARGET);
  const [recorded, setRecorded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllWords().then(setAllWords);
  }, []);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState("");
  const [trainDone, setTrainDone] = useState(false);
  const recorderRef = useRef(new AudioRecorder());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRec(uid: string, word: string) {
    if (!getAsrUrl()) {
      alert("Please set the API URL first.\nGo to the Parent Dashboard → Settings tab.");
      return;
    }

    setRecordingId(uid);
    try {
      await recorderRef.current.start();

      setTimeout(async () => {
        const audioBlob = await recorderRef.current.stop();
        setRecordingId(null);

        try {
          await enrollAudio(audioBlob, word, "child_01");
          setRecorded((s) => new Set(s).add(uid));
          if (recorded.size + 1 >= TARGET) {
            confetti({ particleCount: 200, spread: 100 });
          }
        } catch {
          setRecorded((s) => new Set(s).add(uid));
        }
      }, 2500);
    } catch {
      setRecordingId(null);
      alert("Microphone access denied");
    }
  }

  async function handleTrain() {
    setTraining(true);
    setTrainProgress("Starting training...");
    try {
      const res = await startTraining("child_01");
      if (res.error) {
        setTrainProgress(res.error);
        setTraining(false);
        return;
      }
      setTrainProgress(res.message || "Training started...");

      pollRef.current = setInterval(async () => {
        try {
          const status = await getTrainingStatus();
          setTrainProgress(status.progress);
          if (!status.is_training && (status.progress.startsWith("Done") || status.progress === "complete")) {
            if (pollRef.current) clearInterval(pollRef.current);
            setTraining(false);
            setTrainDone(true);
            confetti({ particleCount: 150, spread: 90 });
          }
        } catch {
          // keep polling
        }
      }, 3000);
    } catch {
      setTrainProgress("Connection error");
      setTraining(false);
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const done = recorded.size >= TARGET;

  return (
    <main className="min-h-screen relative overflow-hidden">
      <FloatingBackground />

      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/learn" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Back">⬅️</Link>
        <div className="bg-white/80 backdrop-blur rounded-full px-5 py-2 shadow-soft font-bold flex items-center gap-2">
          <span className="text-2xl">🎙️</span><span>My Voice</span>
        </div>
        <Link to="/" className="rounded-full bg-white/80 backdrop-blur w-14 h-14 grid place-items-center text-2xl shadow-soft hover:scale-110 transition" aria-label="Home">🏠</Link>
      </div>

      <section className="relative z-10 max-w-3xl mx-auto px-6 mt-4 pb-16">
        {trainDone ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-[3rem] p-12 text-center shadow-pop">
            <div className="text-8xl">🧠</div>
            <h1 className="text-4xl font-bold mt-4">Voice trained! 🎉</h1>
            <p className="text-muted-foreground mt-2">The model now understands your voice!</p>
            <Link to="/learn/talk" className="mt-6 inline-block rounded-full bg-gradient-to-r from-mint to-happy text-white px-8 py-4 text-xl font-bold shadow-pop hover:scale-105 transition">
              🗣️ Try Free Talk!
            </Link>
          </motion.div>
        ) : done ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-[3rem] p-12 text-center shadow-pop">
            <div className="text-8xl">🎉</div>
            <h1 className="text-4xl font-bold mt-4">Your voice is ready! 🌟</h1>
            <p className="text-muted-foreground mt-2">Now let's train the model on your voice!</p>

            <button
              onClick={handleTrain}
              disabled={training}
              className="mt-6 rounded-full bg-gradient-to-r from-sky to-bubble text-white px-8 py-4 text-xl font-bold shadow-pop hover:scale-105 transition disabled:opacity-50 disabled:animate-pulse"
            >
              {training ? "🧠 Training..." : "🚀 Train My Voice"}
            </button>

            {trainProgress && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-sky/10 rounded-2xl p-4">
                <p className="font-semibold text-lg">{trainProgress}</p>
                {training && <p className="text-sm text-muted-foreground mt-1">This takes 2-3 minutes, please wait...</p>}
              </motion.div>
            )}

            <button onClick={() => setRecorded(new Set())} className="mt-4 rounded-full bg-muted px-6 py-3 font-bold text-sm">
              Record more words
            </button>
          </motion.div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow-soft">
                <Mascot size={60} />
                <div className="text-left">
                  <div className="font-bold">Let's teach me your voice!</div>
                  <div className="text-xs text-muted-foreground">Tap 🔴 and say each word</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 shadow-soft mb-4">
              <div className="flex items-center justify-between text-sm font-semibold mb-2">
                <span>{recorded.size} / {TARGET} words recorded ✅</span>
                <span>{Math.round((recorded.size / TARGET) * 100)}%</span>
              </div>
              <div className="h-4 rounded-full bg-muted overflow-hidden relative">
                <motion.div className="h-full bg-gradient-celebrate" animate={{ width: `${(recorded.size / TARGET) * 100}%` }} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">⭐</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3" dir="rtl">
              {items.map((w, i) => {
                const uid = `${w.id}-${i}`;
                const isDone = recorded.has(uid);
                const isRec = recordingId === uid;
                return (
                  <div key={uid} className={`bg-white rounded-2xl p-4 shadow-soft flex items-center gap-3 ${isDone ? "ring-2 ring-happy" : ""}`}>
                    <div className="text-5xl">{w.emoji}</div>
                    <div className="flex-1">
                      <div className="font-arabic text-2xl font-bold">{w.ar}</div>
                    </div>
                    <button onClick={() => playReference(w.ar)} className="w-10 h-10 rounded-full bg-sky text-white grid place-items-center" aria-label="Listen">🔊</button>
                    {isDone ? (
                      <button onClick={() => { const n = new Set(recorded); n.delete(uid); setRecorded(n); }} className="w-10 h-10 rounded-full bg-happy grid place-items-center text-xl" aria-label="Re-record">✅</button>
                    ) : (
                      <button onClick={() => startRec(uid, w.ar)} disabled={!!recordingId} className={`w-10 h-10 rounded-full grid place-items-center text-xl ${isRec ? "bg-destructive animate-breathe" : "bg-destructive/80 hover:scale-110"}`} aria-label="Record">
                        {isRec ? "⏺️" : "🔴"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
