const STORAGE_KEY = "beyond21_api_url";

export function getApiUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setApiUrl(url: string) {
  const clean = url.replace(/\/+$/, "");
  localStorage.setItem(STORAGE_KEY, clean);
}

const HEADERS = { "ngrok-skip-browser-warning": "true" };

export async function checkHealth(): Promise<boolean> {
  const base = getApiUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/health`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pronounce(audioBlob: Blob, targetWord: string): Promise<{
  target_word?: string;
  phoneme_scores?: Array<{
    phoneme: string;
    arabic: string;
    gop: number;
    status: string;
    stars: number;
  }>;
  overall_score?: number;
  tone_match?: number;
  passed?: boolean;
  weak_phonemes?: Array<{ phoneme: string; arabic: string }>;
  feedback?: string;
  error?: string;
}> {
  const base = getApiUrl();
  const form = new FormData();
  form.append("audio", audioBlob, "recording.wav");
  form.append("target_word", targetWord);
  const res = await fetch(`${base}/api/pronounce`, {
    method: "POST",
    body: form,
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`Pronounce failed: ${res.status}`);
  return res.json();
}

export function getReferenceAudioUrl(word: string): string {
  const base = getApiUrl();
  return `${base}/api/reference-audio/${encodeURIComponent(word)}`;
}

export async function playReferenceAudio(word: string): Promise<void> {
  const base = getApiUrl();
  if (!base) return;
  const url = `${base}/api/reference-audio/${encodeURIComponent(word)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error("Failed to fetch audio");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const audio = new Audio(objectUrl);
    audio.onended = () => { URL.revokeObjectURL(objectUrl); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(); };
    audio.play().catch(() => { URL.revokeObjectURL(objectUrl); resolve(); });
  });
}

export async function startTraining(speakerId = "child_01"): Promise<{
  status?: string;
  speaker_id?: string;
  recordings?: number;
  message?: string;
  error?: string;
}> {
  const base = getApiUrl();
  const form = new FormData();
  form.append("speaker_id", speakerId);
  const res = await fetch(`${base}/api/train`, {
    method: "POST",
    body: form,
    headers: HEADERS,
  });
  return res.json();
}

export async function getTrainingStatus(): Promise<{
  is_training: boolean;
  progress: string;
  speaker: string | null;
}> {
  const base = getApiUrl();
  const res = await fetch(`${base}/api/train/status`, { headers: HEADERS });
  return res.json();
}

export async function getEnrolled(): Promise<{
  speakers: Record<string, { total_recordings: number; unique_words: number; has_adapter: boolean }>;
}> {
  const base = getApiUrl();
  const res = await fetch(`${base}/api/enrolled`, { headers: HEADERS });
  return res.json();
}

export async function transcribe(audioBlob: Blob): Promise<{
  speaker: string;
  confidence: number;
  whisper_raw: string;
  recognized: string;
  vocab_match: string;
  original_text: string;
  edit_dist: number;
  in_vocabulary: boolean;
  all_candidates: string[];
}> {
  const base = getApiUrl();
  const form = new FormData();
  form.append("audio", audioBlob, "recording.wav");
  const res = await fetch(`${base}/api/transcribe`, {
    method: "POST",
    body: form,
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
  return res.json();
}

export async function fetchVocabulary(): Promise<Array<{
  original: string;
  clean: string;
  is_sentence: boolean;
  has_reference_audio: boolean;
}>> {
  const base = getApiUrl();
  const res = await fetch(`${base}/api/vocabulary`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Vocabulary failed: ${res.status}`);
  const data = await res.json();
  return data.vocabulary;
}
