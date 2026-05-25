import { getActiveChild, recordPronunciation, recordQuizSession } from "./auth";

const STORE_KEY = "beyond21_activity";

export type PronunciationRecord = {
  ts: number;
  wordId: string;
  wordAr: string;
  emoji: string;
  passed: boolean;
  overallScore: number;
  phonemeScores: Array<{ arabic: string; stars: number }>;
};

export type QuizRecord = {
  ts: number;
  totalQuestions: number;
  correct: number;
  avgT: number;
  avgI: number;
  avgF: number;
  dominantAction: string;
};

export type ActivityEntry = {
  ts: number;
  icon: string;
  text: string;
};

export type StoreData = {
  pronunciations: PronunciationRecord[];
  quizzes: QuizRecord[];
  activities: ActivityEntry[];
  totalStars: number;
};

function load(): StoreData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { pronunciations: [], quizzes: [], activities: [], totalStars: 0 };
}

function save(data: StoreData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export const activityStore = {
  get: load,

  recordPronunciation(record: Omit<PronunciationRecord, "ts">) {
    const data = load();
    const entry: PronunciationRecord = { ...record, ts: Date.now() };
    data.pronunciations = [entry, ...data.pronunciations].slice(0, 200);
    if (record.passed) data.totalStars += 1;
    data.activities = [
      {
        ts: Date.now(),
        icon: record.passed ? "⭐" : "🔄",
        text: record.passed
          ? `Said "${record.wordAr}" correctly!`
          : `Practiced "${record.wordAr}"`,
      },
      ...data.activities,
    ].slice(0, 50);
    save(data);

    const child = getActiveChild();
    if (child) {
      recordPronunciation({
        child_id: child.id,
        word_id: record.wordId,
        word_ar: record.wordAr,
        emoji: record.emoji,
        passed: record.passed,
        overall_score: record.overallScore,
        phoneme_scores: record.phonemeScores,
      }).catch(() => {});
    }
  },

  recordQuiz(record: Omit<QuizRecord, "ts">) {
    const data = load();
    const entry: QuizRecord = { ...record, ts: Date.now() };
    data.quizzes = [entry, ...data.quizzes].slice(0, 50);
    data.activities = [
      {
        ts: Date.now(),
        icon: "🧩",
        text: `Quiz: ${record.correct}/${record.totalQuestions} correct`,
      },
      ...data.activities,
    ].slice(0, 50);
    save(data);

    const child = getActiveChild();
    if (child) {
      recordQuizSession({
        child_id: child.id,
        total_questions: record.totalQuestions,
        correct: record.correct,
        avg_t: record.avgT,
        avg_i: record.avgI,
        avg_f: record.avgF,
        dominant_action: record.dominantAction,
      }).catch(() => {});
    }
  },

  recordActivity(icon: string, text: string) {
    const data = load();
    data.activities = [
      { ts: Date.now(), icon, text },
      ...data.activities,
    ].slice(0, 50);
    save(data);
  },

  getWordStats(): Map<string, { attempts: number; passes: number; bestScore: number; lastAttempt: number }> {
    const data = load();
    const map = new Map<string, { attempts: number; passes: number; bestScore: number; lastAttempt: number }>();
    for (const p of data.pronunciations) {
      const existing = map.get(p.wordId) || { attempts: 0, passes: 0, bestScore: 0, lastAttempt: 0 };
      existing.attempts += 1;
      if (p.passed) existing.passes += 1;
      if (p.overallScore > existing.bestScore) existing.bestScore = p.overallScore;
      if (p.ts > existing.lastAttempt) existing.lastAttempt = p.ts;
      map.set(p.wordId, existing);
    }
    return map;
  },

  getTodayActivity(): ActivityEntry[] {
    const data = load();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.activities.filter((a) => a.ts >= today.getTime());
  },

  clear() {
    localStorage.removeItem(STORE_KEY);
  },
};
