const API_URL = "http://localhost:8000";
const ASR_URL = "http://localhost:8001";

export function getApiUrl(): string {
  return API_URL;
}

export function getAsrUrl(): string {
  return ASR_URL;
}

const HEADERS = { "ngrok-skip-browser-warning": "true" };

export async function checkHealth(): Promise<boolean> {
  const base = getApiUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/medical/health`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkAsrHealth(): Promise<boolean> {
  const base = getAsrUrl();
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
  const base = getAsrUrl();
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
  const base = getAsrUrl();
  return `${base}/api/reference-audio/${encodeURIComponent(word)}`;
}

export async function playReferenceAudio(word: string): Promise<void> {
  const base = getAsrUrl();
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
  const base = getAsrUrl();
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
  const base = getAsrUrl();
  const res = await fetch(`${base}/api/train/status`, { headers: HEADERS });
  return res.json();
}

export async function getEnrolled(): Promise<{
  speakers: Record<string, { total_recordings: number; unique_words: number; has_adapter: boolean }>;
}> {
  const base = getAsrUrl();
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
  const base = getAsrUrl();
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
  const base = getAsrUrl();
  const res = await fetch(`${base}/api/vocabulary`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Vocabulary failed: ${res.status}`);
  const data = await res.json();
  return data.vocabulary;
}
export async function predictAdaptive(features: {
  response_time: number;
  error_rate: number;
  hesitation_count: number;
  focus_ratio: number;
  frustration_score: number;
  movement_intensity: number;
  question_id?: number;
  is_answering?: boolean;
}): Promise<{
  action_id: number;
  action_name: string;
  reason: string;
  T: number;
  I: number;
  F: number;
  dqn_action_id: number;
  override_applied: boolean;
  q_values: { CONTINUE_LEVEL: number; PROVIDE_HINT: number; SENSORY_BREAK: number };
  confidence: number;
  question_id: number;
  is_answering: boolean;
}> {
  const base = getApiUrl() || "http://localhost:8000";
  const res = await fetch(`${base}/api/adaptive/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...HEADERS },
    body: JSON.stringify(features),
  });
  if (!res.ok) throw new Error(`Adaptive predict failed: ${res.status}`);
  return res.json();
}

export async function analyzeMedicalImage(file: File): Promise<{
  score: number;
  label: string;
  anomaly_map: string;
  reconstruction: string;
  gradcam: string;
}> {
  const base = getApiUrl() || "http://localhost:8000";
  const form = new FormData();
  form.append("image", file);

  const res = await fetch(`${base}/api/medical/predict`, {
    method: "POST",
    body: form,
    headers: HEADERS,
  });

  if (!res.ok) {
    throw new Error(`Medical analysis failed: ${res.status}`);
  }

  return res.json();
}