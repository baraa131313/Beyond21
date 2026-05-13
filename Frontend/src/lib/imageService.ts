/**
 * imageService.ts
 * Appels au backend FastAPI pour le pipeline Speech-to-Vision.
 */

const HEADERS = { "ngrok-skip-browser-warning": "true" };

// URL Railway backend — fixe, pas besoin de configuration manuelle
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://interactive-learning-platform-production-3b22.up.railway.app";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FullPipelineResponse {
  transcription: string;
  french: string;
  english: string;
  prompt: string;
  negative_prompt: string;
  image_b64: string;
  image_url: string;
  latency_translation: number;
  latency_prompt: number;
  latency_image: number;
  latency_total: number;
  status: string;
}

// ── Pipeline complet ───────────────────────────────────────────────────────────

export async function runFullPipeline(
  transcription: string,
  childId: string = "child_001"
): Promise<FullPipelineResponse> {
  const res = await fetch(`${BACKEND_URL}/api/pipeline/full`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...HEADERS },
    body: JSON.stringify({ transcription, child_id: childId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Pipeline echoue : ${res.status}`);
  }

  return res.json();
}

// ── Utilitaire ────────────────────────────────────────────────────────────────

export function base64ToImageSrc(base64: string): string {
  return `data:image/png;base64,${base64}`;
}