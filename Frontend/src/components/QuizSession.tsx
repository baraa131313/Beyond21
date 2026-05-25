import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { predictAdaptive } from "@/lib/api";
import { activityStore } from "@/lib/activityStore";
import { fetchCustomQuizzes } from "@/lib/auth";

const BUILTIN_QUESTIONS = [
  { id: 1, text: "Find the Fruit! 🔍", type: "emoji-choice" as const, options: [
    { label: "🍎 Apple", value: "a", correct: true },
    { label: "⚽ Ball", value: "b", correct: false },
    { label: "🥦 Vegetable", value: "c", correct: false },
  ]},
  { id: 2, text: "Click the RED colour!", type: "color-choice" as const, options: [
    { label: "Aqua", value: "a", correct: false, color: "#00CED1" },
    { label: "Red", value: "b", correct: true, color: "#E53E3E" },
    { label: "Yellow", value: "c", correct: false, color: "#ECC94B" },
  ]},
  { id: 3, text: "Find the number FIVE!", type: "emoji-choice" as const, options: [
    { label: "5", value: "a", correct: true },
    { label: "M", value: "b", correct: false },
    { label: "A", value: "c", correct: false },
  ]},
  { id: 4, text: "Find the Car! 🔍", type: "emoji-choice" as const, options: [
    { label: "🚌 Bus", value: "a", correct: false },
    { label: "🚗 Car", value: "b", correct: true },
    { label: "🚲 Bicycle", value: "c", correct: false },
  ]},
  { id: 5, text: "Which number is GREATER?", type: "emoji-choice" as const, options: [
    { label: "10", value: "a", correct: true },
    { label: "5", value: "b", correct: false },
    { label: "0", value: "c", correct: false },
  ]},
  { id: 6, text: "What does 1 + 1 equal?", type: "emoji-choice" as const, options: [
    { label: "3", value: "a", correct: false },
    { label: "2", value: "b", correct: true },
    { label: "4", value: "c", correct: false },
  ]},
  { id: 7, text: "Find the SHEEP! 🔍", type: "emoji-choice" as const, options: [
    { label: "🐪 Camel", value: "a", correct: false },
    { label: "🐑 Sheep", value: "b", correct: true },
    { label: "🐐 Goat", value: "c", correct: false },
  ]},
  { id: 8, text: "M is for …?", type: "emoji-choice" as const, options: [
    { label: "🍎 Apple", value: "a", correct: false },
    { label: "🍌 Banana", value: "b", correct: false },
    { label: "🐱 Cat", value: "c", correct: false },
    { label: "🌙 Moon", value: "d", correct: true },
  ]},
  { id: 9, text: "Rabbit lives in …?", type: "emoji-choice" as const, options: [
    { label: "🏠 Human House", value: "a", correct: false },
    { label: "🌳 Tree", value: "b", correct: false },
    { label: "🕳️ Burrow", value: "c", correct: true },
  ]},
  { id: 10, text: "We fly in a …?", type: "emoji-choice" as const, options: [
    { label: "🚗 Car", value: "a", correct: false },
    { label: "🚢 Ship", value: "b", correct: false },
    { label: "✈️ Aeroplane", value: "c", correct: true },
  ]},
  { id: 11, text: "Click the BLUE colour!", type: "color-choice" as const, options: [
    { label: "Green", value: "a", correct: false, color: "#38A169" },
    { label: "Blue", value: "b", correct: true, color: "#3182CE" },
    { label: "Orange", value: "c", correct: false, color: "#DD6B20" },
  ]},
  { id: 12, text: "Find the Dog! 🔍", type: "emoji-choice" as const, options: [
    { label: "🐱 Cat", value: "a", correct: false },
    { label: "🐶 Dog", value: "b", correct: true },
    { label: "🐰 Rabbit", value: "c", correct: false },
  ]},
  { id: 13, text: "What does 2 + 3 equal?", type: "emoji-choice" as const, options: [
    { label: "4", value: "a", correct: false },
    { label: "5", value: "b", correct: true },
    { label: "6", value: "c", correct: false },
  ]},
  { id: 14, text: "Find the Star! 🔍", type: "emoji-choice" as const, options: [
    { label: "🌙 Moon", value: "a", correct: false },
    { label: "⭐ Star", value: "b", correct: true },
    { label: "☀️ Sun", value: "c", correct: false },
  ]},
  { id: 15, text: "Which is the SMALLEST?", type: "emoji-choice" as const, options: [
    { label: "🐘 Elephant", value: "a", correct: false },
    { label: "🐁 Mouse", value: "b", correct: true },
    { label: "🐕 Dog", value: "c", correct: false },
  ]},
  { id: 16, text: "Click the GREEN colour!", type: "color-choice" as const, options: [
    { label: "Purple", value: "a", correct: false, color: "#805AD5" },
    { label: "Pink", value: "b", correct: false, color: "#ED64A6" },
    { label: "Green", value: "c", correct: true, color: "#38A169" },
  ]},
  { id: 17, text: "B is for …?", type: "emoji-choice" as const, options: [
    { label: "🍌 Banana", value: "a", correct: true },
    { label: "🐱 Cat", value: "b", correct: false },
    { label: "🐶 Dog", value: "c", correct: false },
  ]},
  { id: 18, text: "What does 4 - 2 equal?", type: "emoji-choice" as const, options: [
    { label: "1", value: "a", correct: false },
    { label: "2", value: "b", correct: true },
    { label: "3", value: "c", correct: false },
  ]},
  { id: 19, text: "Find the Fish! 🔍", type: "emoji-choice" as const, options: [
    { label: "🐦 Bird", value: "a", correct: false },
    { label: "🐟 Fish", value: "b", correct: true },
    { label: "🐍 Snake", value: "c", correct: false },
  ]},
  { id: 20, text: "Which is TALLER?", type: "emoji-choice" as const, options: [
    { label: "🐱 Cat", value: "a", correct: false },
    { label: "🦒 Giraffe", value: "b", correct: true },
    { label: "🐕 Dog", value: "c", correct: false },
  ]},
  { id: 21, text: "Find the number TEN!", type: "emoji-choice" as const, options: [
    { label: "7", value: "a", correct: false },
    { label: "10", value: "b", correct: true },
    { label: "3", value: "c", correct: false },
  ]},
  { id: 22, text: "Click the YELLOW colour!", type: "color-choice" as const, options: [
    { label: "Yellow", value: "a", correct: true, color: "#ECC94B" },
    { label: "Red", value: "b", correct: false, color: "#E53E3E" },
    { label: "Blue", value: "c", correct: false, color: "#3182CE" },
  ]},
  { id: 23, text: "S is for …?", type: "emoji-choice" as const, options: [
    { label: "🌙 Moon", value: "a", correct: false },
    { label: "⭐ Star", value: "b", correct: true },
    { label: "🍎 Apple", value: "c", correct: false },
  ]},
  { id: 24, text: "Find the Butterfly! 🔍", type: "emoji-choice" as const, options: [
    { label: "🐝 Bee", value: "a", correct: false },
    { label: "🦋 Butterfly", value: "b", correct: true },
    { label: "🐛 Caterpillar", value: "c", correct: false },
  ]},
  { id: 25, text: "What does 3 + 3 equal?", type: "emoji-choice" as const, options: [
    { label: "5", value: "a", correct: false },
    { label: "6", value: "b", correct: true },
    { label: "7", value: "c", correct: false },
  ]},
  { id: 26, text: "Fish lives in …?", type: "emoji-choice" as const, options: [
    { label: "🌳 Tree", value: "a", correct: false },
    { label: "🌊 Water", value: "b", correct: true },
    { label: "🏠 House", value: "c", correct: false },
  ]},
  { id: 27, text: "Which number is SMALLER?", type: "emoji-choice" as const, options: [
    { label: "8", value: "a", correct: false },
    { label: "2", value: "b", correct: true },
    { label: "9", value: "c", correct: false },
  ]},
  { id: 28, text: "Find the Flower! 🔍", type: "emoji-choice" as const, options: [
    { label: "🌳 Tree", value: "a", correct: false },
    { label: "🌸 Flower", value: "b", correct: true },
    { label: "🍃 Leaf", value: "c", correct: false },
  ]},
  { id: 29, text: "Click the PURPLE colour!", type: "color-choice" as const, options: [
    { label: "Orange", value: "a", correct: false, color: "#DD6B20" },
    { label: "Purple", value: "b", correct: true, color: "#805AD5" },
    { label: "Green", value: "c", correct: false, color: "#38A169" },
  ]},
  { id: 30, text: "What does 5 + 5 equal?", type: "emoji-choice" as const, options: [
    { label: "8", value: "a", correct: false },
    { label: "10", value: "b", correct: true },
    { label: "12", value: "c", correct: false },
  ]},
];

type Option = { label: string; value: string; correct: boolean; color?: string };
type Question = { id: number; text: string; type: string; options: Option[] };

const ACTION_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; border: string; msg: string }> = {
  CONTINUE_LEVEL: { emoji: "🚀", label: "Keep Going!", color: "#38A169", bg: "#F0FFF4", border: "#9AE6B4", msg: "You are doing great! Moving to the next question." },
  PROVIDE_HINT: { emoji: "💡", label: "Here's a Hint!", color: "#D69E2E", bg: "#FFFFF0", border: "#FAF089", msg: "Take your time — look at each option carefully." },
  SENSORY_BREAK: { emoji: "🌸", label: "Let's take a Break!", color: "#805AD5", bg: "#FAF5FF", border: "#D6BCFA", msg: "Breathe in … breathe out … you are doing wonderfully." },
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.crossOrigin = "anonymous";
    s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });
}

async function loadScriptRetry(src: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try { await loadScript(src); return; } catch {
      const el = document.querySelector(`script[src="${src}"]`);
      if (el) el.remove();
      if (i === retries - 1) throw new Error(`Failed after ${retries} attempts: ${src}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

type LogRow = {
  q: number; correct: boolean; rt: number; hes: number; err: number;
  focus: number; frust: number; move: number;
  T: number; I: number; F: number; action: string;
};

type Decision = {
  action_id: number; action_name: string; T: number; I: number; F: number;
  confidence: number; q_values: Record<string, number>; _fallback?: boolean;
};

export default function QuizSession({ onFinish }: { onFinish?: () => void }) {
  const [allQuestions, setAllQuestions] = useState<Question[]>(BUILTIN_QUESTIONS as Question[]);
  const [qIndex, setQIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [sessionDone, setSessionDone] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [moveIntensity, setMoveIntensity] = useState(0);
  const [frustScore, setFrustScore] = useState(0);
  const [focusRatio, setFocusRatio] = useState(1);
  const hesCountRef = useRef(0);
  const [hesDisplay, setHesDisplay] = useState(0);
  const wrongRef = useRef(0);
  const totalRef = useRef(0);

  const [aiDecision, setAiDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLog, setSessionLog] = useState<LogRow[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<any>(null);
  const prevLandmarks = useRef<any>(null);
  const moveBuffer = useRef<number[]>([]);
  const cameraRef = useRef<any>(null);

  const lastActivityRef = useRef(Date.now());
  const idleWatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusedSecsRef = useRef(0);
  const totalSecsRef = useRef(0);

  useEffect(() => {
    fetchCustomQuizzes()
      .then((custom) => {
        const mapped = custom.map((q, i) => ({
          id: 1000 + q.id,
          text: q.question_text,
          type: q.question_type as "emoji-choice" | "color-choice",
          options: q.options,
        }));
        if (mapped.length > 0) {
          setAllQuestions([...(BUILTIN_QUESTIONS as Question[]), ...mapped]);
        }
      })
      .catch(() => {});
  }, []);

  // MediaPipe init — matches original exactly, with retry for reliability
  useEffect(() => {
    let cancelled = false;
    async function initMP() {
      try {
        await loadScriptRetry("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScriptRetry("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
        await loadScriptRetry("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");
        if (cancelled) return;

        const Pose = (window as any).Pose;
        const Camera = (window as any).Camera;
        if (!Pose || !Camera) return;

        const pose = new Pose({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
        });
        pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

        pose.onResults((results: any) => {
          if (!results.poseLandmarks) return;

          const JOINTS = [0, 11, 12, 13, 14];
          const lm = results.poseLandmarks;
          let normalised = 0;

          if (prevLandmarks.current) {
            let totalDist = 0, count = 0;
            JOINTS.forEach((idx) => {
              if (lm[idx] && prevLandmarks.current[idx]) {
                const dx = lm[idx].x - prevLandmarks.current[idx].x;
                const dy = lm[idx].y - prevLandmarks.current[idx].y;
                totalDist += Math.sqrt(dx * dx + dy * dy);
                count++;
              }
            });
            const raw = count > 0 ? totalDist / count : 0;
            moveBuffer.current.push(raw);
            if (moveBuffer.current.length > 10) moveBuffer.current.shift();
            const avg = moveBuffer.current.reduce((a, b) => a + b, 0) / moveBuffer.current.length;
            normalised = Math.min(avg / 0.06, 1.0);
            setMoveIntensity(parseFloat(normalised.toFixed(3)));
          }
          prevLandmarks.current = lm;

          const nose = lm[0];
          const noseVisible = nose && nose.visibility > 0.5;
          const noseCentered = noseVisible && Math.abs(nose.x - 0.5) < 0.25 && Math.abs(nose.y - 0.5) < 0.35;
          totalSecsRef.current += 1 / 30;
          if (noseCentered) focusedSecsRef.current += 1 / 30;
          const fr = totalSecsRef.current > 0 ? focusedSecsRef.current / totalSecsRef.current : 1.0;
          setFocusRatio(parseFloat(fr.toFixed(3)));

          const errRate = totalRef.current > 0 ? wrongRef.current / totalRef.current : 0;
          const simFrust = parseFloat(Math.min(0.3 * normalised + 0.5 * errRate + 0.05, 1.0).toFixed(3));
          setFrustScore(simFrust);

          // Draw skeleton overlay (as in original)
          if (canvasRef.current && videoRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              if ((window as any).drawConnectors && (window as any).drawLandmarks) {
                (window as any).drawConnectors(ctx, results.poseLandmarks, (window as any).POSE_CONNECTIONS, { color: "#00CED1", lineWidth: 1 });
                (window as any).drawLandmarks(ctx, results.poseLandmarks, { color: "#FF6B6B", lineWidth: 1, radius: 3 });
              }
            }
          }
        });

        poseRef.current = pose;

        const waitVideo = () => new Promise<void>((res) => {
          const c = () => { if (videoRef.current) res(); else setTimeout(c, 100); };
          c();
        });
        await waitVideo();
        if (cancelled) return;

        const cam = new Camera(videoRef.current!, {
          onFrame: async () => {
            if (poseRef.current && videoRef.current) {
              try { await poseRef.current.send({ image: videoRef.current }); } catch {}
            }
          },
          width: 160, height: 120,
        });
        cam.start();
        cameraRef.current = cam;
      } catch (err) {
        console.warn("MediaPipe load failed:", err);
      }
    }
    initMP();
    return () => { cancelled = true; if (cameraRef.current) { try { cameraRef.current.stop(); } catch {} } };
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qIndex]);

  useEffect(() => {
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity);
    idleWatchRef.current = setInterval(() => {
      const idle = (Date.now() - lastActivityRef.current) / 1000;
      if (idle > 2 && !answered) {
        hesCountRef.current += 1;
        setHesDisplay(hesCountRef.current);
      }
    }, 2000);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      if (idleWatchRef.current) clearInterval(idleWatchRef.current);
    };
  }, [answered]);

  useEffect(() => {
    hesCountRef.current = 0;
    setHesDisplay(0);
    lastActivityRef.current = Date.now();
    focusedSecsRef.current = 0;
    totalSecsRef.current = 0;
  }, [qIndex]);

  const handleAnswer = useCallback(async (opt: Option) => {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const responseTime = parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(2));
    const isCorrect = opt.correct;
    totalRef.current += 1;
    if (!isCorrect) wrongRef.current += 1;
    const errorRate = parseFloat((wrongRef.current / totalRef.current).toFixed(3));
    setSelectedOpt(opt.value);
    setAnswered(true);
    setLoading(true);

    const features = {
      response_time: Math.min(responseTime, 60),
      error_rate: errorRate,
      hesitation_count: Math.min(hesCountRef.current, 15),
      focus_ratio: focusRatio,
      frustration_score: frustScore,
      movement_intensity: moveIntensity,
      question_id: qIndex + 1,
      is_answering: true,
    };

    let decision: Decision;
    try {
      decision = await predictAdaptive(features);
    } catch {
      const T = 1 - errorRate;
      const I = (1 - focusRatio) * 0.5 + moveIntensity * 0.3 + (1 - frustScore) * 0.2;
      let action_name = "CONTINUE_LEVEL";
      if (I > 0.6) action_name = "SENSORY_BREAK";
      else if (T < 0.4 && I < 0.4) action_name = "PROVIDE_HINT";
      decision = {
        action_id: action_name === "CONTINUE_LEVEL" ? 0 : action_name === "PROVIDE_HINT" ? 1 : 2,
        action_name,
        T: parseFloat(T.toFixed(3)), I: parseFloat(I.toFixed(3)), F: parseFloat(errorRate.toFixed(3)),
        q_values: { CONTINUE_LEVEL: 0, PROVIDE_HINT: 0, SENSORY_BREAK: 0 },
        confidence: 0, _fallback: true,
      };
    }
    setAiDecision(decision);
    setLoading(false);
    setSessionLog((prev) => [...prev, {
      q: qIndex + 1, correct: isCorrect, rt: responseTime, hes: hesCountRef.current,
      err: errorRate, focus: focusRatio, frust: frustScore, move: moveIntensity,
      T: decision?.T ?? 0, I: decision?.I ?? 0, F: decision?.F ?? 0,
      action: decision?.action_name ?? "—",
    }]);
  }, [answered, focusRatio, frustScore, moveIntensity, qIndex]);

  const handleNext = useCallback(() => {
    if (qIndex + 1 >= allQuestions.length) {
      setSessionDone(true);
      const correct = sessionLog.filter((r) => r.correct).length;
      const avgT = sessionLog.reduce((s, r) => s + r.T, 0) / sessionLog.length;
      const avgI = sessionLog.reduce((s, r) => s + r.I, 0) / sessionLog.length;
      const avgF = sessionLog.reduce((s, r) => s + r.F, 0) / sessionLog.length;
      const counts: Record<string, number> = {};
      sessionLog.forEach((r) => { counts[r.action] = (counts[r.action] || 0) + 1; });
      const dominantAction = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "CONTINUE_LEVEL";
      activityStore.recordQuiz({
        totalQuestions: sessionLog.length,
        correct,
        avgT: +avgT.toFixed(3),
        avgI: +avgI.toFixed(3),
        avgF: +avgF.toFixed(3),
        dominantAction,
      });
    } else {
      setQIndex((i) => i + 1);
      setAnswered(false);
      setSelectedOpt(null);
      setAiDecision(null);
    }
  }, [qIndex]);

  if (sessionDone) {
    return <ResultsScreen log={sessionLog} onFinish={onFinish} />;
  }

  const q = allQuestions[qIndex];
  const action = aiDecision ? ACTION_CONFIG[aiDecision.action_name] : null;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="bg-white/80 backdrop-blur rounded-full px-5 py-2.5 shadow-soft flex items-center gap-4">
        <div className="flex items-center gap-3 min-w-[140px]">
          <span className="text-sm text-muted-foreground font-semibold">Q {qIndex + 1} / {allQuestions.length}</span>
        </div>
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 bg-gradient-celebrate" style={{ width: `${((qIndex + 1) / allQuestions.length) * 100}%` }} />
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${elapsed > 20 ? "bg-red-100 text-red-700" : "bg-sky/20 text-sky"}`}>
          ⏱ {elapsed}s
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-3 items-start">
        {/* Left — camera + features */}
        <div className="flex flex-col gap-3">
          <div className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-soft">
            <video ref={videoRef} className="w-full aspect-[4/3] block object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} width={160} height={120} className="absolute top-0 left-0 w-full h-full" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-lg">📷 Live Camera</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-3xl p-4 shadow-soft">
            <div className="font-bold text-xs text-foreground mb-2">🧠 Live Features</div>
            <FeatureRow label="Focus ratio" value={focusRatio} color="#38A169" />
            <FeatureRow label="Move intensity" value={moveIntensity} color="#DD6B20" />
            <FeatureRow label="Frustration" value={frustScore} color="#E53E3E" />
            <FeatureRow label="Error rate" value={totalRef.current > 0 ? wrongRef.current / totalRef.current : 0} color="#805AD5" />
            <div className="text-[11px] text-muted-foreground mt-2">⏸ Hesitations: <b>{hesDisplay}</b></div>
            <div className="text-[11px] text-muted-foreground mt-1">⏱ Response time: <b>{elapsed}s</b></div>
          </div>
        </div>

        {/* Centre — question */}
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-[2rem] p-10 shadow-soft text-center min-h-[280px] flex flex-col justify-center">
            <div className="text-3xl font-bold text-foreground leading-relaxed mb-2">{q.text}</div>
            <div className="flex flex-wrap gap-4 justify-center mt-6">
              {q.options.map((opt) => {
                let bg = "#F7FAFC", border = "#CBD5E0", txtColor = "#2D3748";
                if (answered) {
                  if (opt.correct) { bg = "#F0FFF4"; border = "#68D391"; txtColor = "#276749"; }
                  else if (opt.value === selectedOpt) { bg = "#FFF5F5"; border = "#FC8181"; txtColor = "#C53030"; }
                }
                const isColor = q.type === "color-choice" && "color" in opt;
                return (
                  <button key={opt.value} onClick={() => handleAnswer(opt)} disabled={answered}
                    className="px-8 py-4 rounded-2xl text-lg font-semibold cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg min-w-[160px]"
                    style={{
                      background: isColor ? opt.color : bg,
                      border: `2.5px solid ${isColor ? opt.color : border}`,
                      color: isColor ? "#fff" : txtColor,
                    }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {loading && (
              <div className="flex items-center gap-2.5 justify-center mt-5">
                <div className="w-5 h-5 rounded-full border-3 border-gray-200 border-t-blue-500 animate-spin" />
                <span className="text-muted-foreground text-sm">Getting your next question ready! 🌟</span>
              </div>
            )}
          </div>

          {/* AI decision card */}
          {aiDecision && action && !loading && (
            <div className="rounded-2xl p-5 shadow-soft" style={{ background: action.bg, border: `2px solid ${action.border}` }}>
              <div className="flex items-center gap-3.5 mb-3.5">
                <span className="text-[32px]">{action.emoji}</span>
                <div>
                  <div className="text-lg font-extrabold" style={{ color: action.color }}>{action.label}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{action.msg}</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-center mb-3.5">
                <TifPill label="T" value={aiDecision.T} color="#38A169" />
                <TifPill label="I" value={aiDecision.I} color="#D69E2E" />
                <TifPill label="F" value={aiDecision.F} color="#E53E3E" />
                {aiDecision.confidence > 0 && <span className="bg-gray-100 text-muted-foreground text-[11px] px-2 py-0.5 rounded-lg font-semibold">conf {(aiDecision.confidence * 100).toFixed(0)}%</span>}
                {aiDecision._fallback && <span className="bg-red-50 text-red-600 text-[11px] px-2 py-0.5 rounded-lg font-semibold">⚠ offline mode</span>}
              </div>
              <button onClick={handleNext}
                className="rounded-full bg-gradient-celebrate text-white px-8 py-3 text-[15px] font-bold shadow-pop hover:scale-105 transition">
                {qIndex + 1 >= allQuestions.length ? "See Results 🏆" : "Next Question →"}
              </button>
            </div>
          )}
        </div>

        {/* Right — session log */}
        <div className="bg-white/80 backdrop-blur rounded-3xl p-3.5 shadow-soft max-h-[80vh] overflow-y-auto min-h-[300px]">
          <div className="font-bold text-xs text-foreground mb-2.5">📋 Session Log</div>
          {sessionLog.length === 0
            ? <div className="text-muted-foreground text-xs text-center mt-8">Answers will appear here…</div>
            : sessionLog.map((row, i) => (
              <div key={i} className="bg-white rounded-lg p-2 mb-2" style={{ borderLeft: `3px solid ${row.correct ? "#68D391" : "#FC8181"}` }}>
                <div className="font-semibold text-xs text-foreground">Q{row.q} {row.correct ? "✅" : "❌"}</div>
                <div className="text-[11px] text-muted-foreground">{row.rt}s · err {(row.err * 100).toFixed(0)}%</div>
                <div className="text-[11px]">
                  <span style={{ color: "#38A169" }}>T{row.T}</span>{" "}
                  <span style={{ color: "#D69E2E" }}>I{row.I}</span>{" "}
                  <span style={{ color: "#E53E3E" }}>F{row.F}</span>
                </div>
                <div className="text-[11px] font-medium text-primary">
                  {row.action === "CONTINUE_LEVEL" ? "🚀 Continue" : row.action === "PROVIDE_HINT" ? "💡 Hint" : "🌸 Break"}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(Math.round(value * 100), 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold" style={{ color }}>{value.toFixed(2)}</span>
      </div>
      <div className="bg-gray-200 rounded h-1.5 overflow-hidden">
        <div className="h-full rounded transition-all duration-400" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function TifPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-full px-2.5 py-1 flex items-center gap-1" style={{ border: `1.5px solid ${color}` }}>
      <span className="font-bold text-xs" style={{ color }}>{label}</span>
      <span className="text-xs text-foreground">{value?.toFixed(2) ?? "—"}</span>
    </div>
  );
}

function ResultsScreen({ log, onFinish }: { log: LogRow[]; onFinish?: () => void }) {
  const correct = log.filter((r) => r.correct).length;
  const avgT = (log.reduce((s, r) => s + r.T, 0) / log.length).toFixed(2);
  const avgI = (log.reduce((s, r) => s + r.I, 0) / log.length).toFixed(2);
  const avgF = (log.reduce((s, r) => s + r.F, 0) / log.length).toFixed(2);
  const dominantAction = (() => {
    const counts: Record<string, number> = {};
    log.forEach((r) => { counts[r.action] = (counts[r.action] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  })();
  const cfg = ACTION_CONFIG[dominantAction] || ACTION_CONFIG.CONTINUE_LEVEL;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] p-8 shadow-soft text-center">
        <div className="text-[56px] mb-2">🏆</div>
        <h2 className="text-[26px] font-bold text-foreground m-0 mb-1">Session Complete!</h2>
        <p className="text-muted-foreground mb-6">Here is what the AI observed</p>
        <div className="flex justify-center gap-4 mb-6">
          <StatCard label="Correct" value={`${correct} / ${log.length}`} color="#38A169" />
          <StatCard label="Avg T (focus)" value={avgT} color="#38A169" />
          <StatCard label="Avg I (ambig.)" value={avgI} color="#D69E2E" />
          <StatCard label="Avg F (frustrat.)" value={avgF} color="#E53E3E" />
        </div>
        <div className="rounded-xl p-4 mb-6" style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}>
          <div className="text-2xl">{cfg.emoji}</div>
          <div className="font-semibold mt-1" style={{ color: cfg.color }}>
            Most frequent action: {dominantAction.replace(/_/g, " ")}
          </div>
        </div>
        <div className="text-left mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                {["Q", "✓", "RT", "T", "I", "F", "Action"].map((h) => (
                  <th key={h} className="p-1.5 px-2 text-muted-foreground font-semibold border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-1 px-2">Q{row.q}</td>
                  <td className="p-1 px-2">{row.correct ? "✅" : "❌"}</td>
                  <td className="p-1 px-2">{row.rt}s</td>
                  <td className="p-1 px-2 text-green-600">{row.T}</td>
                  <td className="p-1 px-2 text-yellow-600">{row.I}</td>
                  <td className="p-1 px-2 text-red-500">{row.F}</td>
                  <td className="p-1 px-2 text-primary font-medium">
                    {row.action === "CONTINUE_LEVEL" ? "🚀" : row.action === "PROVIDE_HINT" ? "💡" : "🌸"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {onFinish && (
          <button onClick={onFinish}
            className="w-full rounded-full bg-gradient-celebrate text-white px-7 py-3 text-[15px] font-bold shadow-pop hover:scale-105 transition">
            Done 🎉
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 bg-gray-50 rounded-lg py-3 px-2 min-w-[80px]">
      <div className="font-bold text-xl" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
