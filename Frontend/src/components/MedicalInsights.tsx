import { DragEvent, useRef, useState } from "react";
import { analyzeMedicalImage } from "@/lib/api";

const SCORE_THRESHOLD = 0.18;

type MedicalResult = {
  score: number;
  label: string;
  anomaly_map: string;
  gradcam: string;
};

export function MedicalInsights() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<MedicalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelection(selected: File | null) {
    setError(null);
    setResult(null);
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const incoming = event.dataTransfer.files?.[0];
    if (incoming) handleFileSelection(incoming);
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Please upload an MRI image before analyzing.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeMedicalImage(file);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Medical Insights</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Upload a brain MRI scan to detect Down Syndrome markers. Our AI analyzes structural patterns and highlights areas of interest.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              onClick={() => inputRef.current?.click()}
            >
              Choose MRI image
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
        />

        <div
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          className="mt-6 rounded-3xl border border-dashed border-border bg-muted/50 p-6 text-center transition hover:border-primary hover:bg-muted"
        >
          <p className="text-sm font-semibold text-muted-foreground">Drag & drop an MRI image here, or click “Choose MRI image”.</p>
          {preview ? (
            <img src={preview} alt="Uploaded MRI preview" className="mx-auto mt-4 max-h-72 rounded-3xl object-contain" />
          ) : (
            <p className="mt-4 text-sm text-foreground/70">Accepted formats: JPG, PNG, BMP</p>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold">Anomaly Score</h2>
              <p className="mt-3 text-5xl font-bold text-foreground">{result.score.toFixed(2)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Threshold: 0.18 — above this means anomaly detected.</p>
              <div className={`mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold shadow-soft ${result.score > SCORE_THRESHOLD ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {result.score > SCORE_THRESHOLD ? "⚠️ Anomaly detected" : "✅ Normal"}
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold">Interpretation</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The model returns an anomaly score, anomaly map, and GradCAM heatmap for the uploaded MRI image.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              { title: "Original", src: preview || "", badge: "source" },
              { title: "Anomaly Map", src: result.anomaly_map, badge: "difference" },
              { title: "GradCAM", src: result.gradcam, badge: "saliency" },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl bg-white p-4 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold">{item.title}</p>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.badge}</span>
                </div>
                <div className="h-72 overflow-hidden rounded-3xl bg-black/5">
                  {item.src ? (
                    <img src={item.src} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">No preview</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="rounded-3xl bg-white p-10 shadow-soft text-center">
          <div className="text-6xl inline-block animate-bounce">🧠</div>
          <p className="text-lg font-bold mt-4">Analyzing brain scan...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait while we process the image</p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Upload a brain MRI scan above and click Analyze. The AI will process the image and show results here.</p>
        </div>
      )}
    </div>
  );
}
