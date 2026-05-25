"""
Beyond 21 — ASR Server (port 8001)
Loads Whisper LoRA adapter from HuggingFace: zienebo/ds-asr-tunisian
Run: python asr_server.py
"""

import os, sys, re, gc, io, pickle, tempfile, subprocess

ESPEAK_DIR = r"C:\Program Files\eSpeak NG"
FFMPEG_DIR = r"C:\Users\baraa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin"
for _dir in [ESPEAK_DIR, FFMPEG_DIR]:
    if os.path.isdir(_dir):
        os.environ["PATH"] = _dir + os.pathsep + os.environ.get("PATH", "")
if os.path.isdir(ESPEAK_DIR):
    os.environ["PHONEMIZER_ESPEAK_PATH"] = os.path.join(ESPEAK_DIR, "espeak-ng.exe")
    os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = os.path.join(ESPEAK_DIR, "libespeak-ng.dll")

import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
import librosa
import librosa.core.audio
import soundfile as sf
import Levenshtein
from pathlib import Path

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
PREPARED_DIR = BASE_DIR / "prepared_data"
REF_AUDIO_DIR = BASE_DIR / "reference_audio"
ENROLL_DIR = BASE_DIR / "enrolled_audio"
ENROLL_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)
PREPARED_DIR.mkdir(exist_ok=True)
REF_AUDIO_DIR.mkdir(exist_ok=True)

TARGET_SR = 16000
MODEL_ID = "openai/whisper-large-v3-turbo"
HF_ADAPTER = "zienebo/ds-asr-tunisian"
W2V_MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device: {device}")

# ============================================================
# LOAD MODELS
# ============================================================
from transformers import (
    WhisperForConditionalGeneration, WhisperProcessor,
    Wav2Vec2ForCTC, Wav2Vec2Processor,
    GPT2LMHeadModel, GPT2Tokenizer,
)
from peft import PeftModel
from sklearn.metrics.pairwise import cosine_similarity

# --- Whisper ASR ---
print("Loading Whisper base model...")
whisper_base = WhisperForConditionalGeneration.from_pretrained(
    MODEL_ID, torch_dtype=torch.float32, low_cpu_mem_usage=True
)
processor = WhisperProcessor.from_pretrained(MODEL_ID)

# Load LoRA adapter from HuggingFace
print(f"Loading LoRA adapter from HuggingFace: {HF_ADAPTER}...")
try:
    whisper_model = PeftModel.from_pretrained(whisper_base, HF_ADAPTER)
    print("  Loaded FINE-TUNED model (HuggingFace LoRA adapter)")
except Exception as e:
    print(f"  WARNING: Could not load adapter ({e}) — using raw Whisper!")
    whisper_model = whisper_base

whisper_model.generation_config.forced_decoder_ids = processor.get_decoder_prompt_ids(
    language="ar", task="transcribe"
)
whisper_model.generation_config.suppress_tokens = []
whisper_model = whisper_model.to(device).eval()
del whisper_base
gc.collect()
print("  Whisper ready")

# --- Speaker ID ---
print("Loading Speaker ID...")
try:
    from speechbrain.inference import EncoderClassifier
    speaker_encoder = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        run_opts={"device": device},
    )
    speaker_id_available = True
except Exception as e:
    print(f"  WARNING: Speaker ID not available ({e})")
    speaker_encoder = None
    speaker_id_available = False

emb_path = PREPARED_DIR / "speaker_embeddings.pkl"
enrolled_speakers = {}
if emb_path.exists():
    with open(emb_path, "rb") as f:
        enrolled_speakers = pickle.load(f)
    print(f"  Enrolled speakers: {list(enrolled_speakers.keys())}")

# --- Derja LM ---
LM_DIR = MODELS_DIR / "derja_lm"
derja_lm = None
derja_lm_tokenizer = None
if (LM_DIR / "model.safetensors").exists():
    derja_lm_tokenizer = GPT2Tokenizer.from_pretrained(str(LM_DIR))
    derja_lm = GPT2LMHeadModel.from_pretrained(str(LM_DIR)).to(device).eval()
    print("  Derja LM loaded")
else:
    print("  Derja LM not found — skipping (LM rescoring disabled)")

# --- wav2vec2 for pronunciation ---
w2v_available = False
w2v_processor = None
w2v_model = None
w2v_vocab = {}
w2v_blank_id = 0
W2V_LOCAL = MODELS_DIR / "wav2vec2-xlsr-53-espeak-cv-ft"
print("Loading wav2vec2 (pronunciation)...")
try:
    from transformers import AutoProcessor
    w2v_path = str(W2V_LOCAL) if (W2V_LOCAL / "pytorch_model.bin").exists() else W2V_MODEL
    w2v_processor = AutoProcessor.from_pretrained(w2v_path)
    w2v_model = Wav2Vec2ForCTC.from_pretrained(w2v_path).to(device).eval()
    w2v_vocab = w2v_processor.tokenizer.get_vocab()
    w2v_blank_id = w2v_processor.tokenizer.pad_token_id
    w2v_available = True
    print(f"  wav2vec2 ready — vocab: {len(w2v_vocab)} (from {'local' if w2v_path == str(W2V_LOCAL) else 'HuggingFace'})")
except Exception as e:
    print(f"  WARNING: wav2vec2 not available ({e}) — pronunciation scoring disabled")

print("\nAll models loaded!\n")

# ============================================================
# VOCABULARY
# ============================================================
def strip_diacritics(text):
    return re.compile(r"[ً-ْٰ]").sub("", text).strip()

def normalize_arabic(text):
    text = re.compile(r"[ً-ْٰ]").sub("", text)
    text = re.sub(r"[​-‏‪-‮⁠﻿]", "", text)
    text = text.replace("آ", "ا").replace("أ", "ا")
    text = text.replace("إ", "ا").replace("ى", "ي")
    return text.strip()

meta_path = PREPARED_DIR / "metadata_with_speakers.xlsx"
if not meta_path.exists():
    meta_path = BASE_DIR / "metadata.xlsx"

vocab_entries = []
vocab_clean = []
vocab_original = {}
ref_audio_map = {}

if meta_path.exists():
    df_meta = pd.read_excel(meta_path)
    for text in df_meta["transcription"].dropna().unique():
        text = str(text).strip()
        if text:
            vocab_entries.append({
                "original": text,
                "clean": strip_diacritics(text),
                "is_sentence": len(text.split()) > 1,
            })
    vocab_clean = [e["clean"] for e in vocab_entries]
    vocab_original = {e["clean"]: e["original"] for e in vocab_entries}
    for entry in vocab_entries:
        clean = entry["clean"]
        ref_path = REF_AUDIO_DIR / f'{clean.replace(" ", "_")}.wav'
        if ref_path.exists():
            ref_audio_map[clean] = str(ref_path)
    print(f"Vocabulary: {len(vocab_entries)} entries, {len(ref_audio_map)} with reference audio")
else:
    print("WARNING: No metadata.xlsx found — vocabulary empty")

# ============================================================
# PIPELINE FUNCTIONS
# ============================================================
def identify_speaker(audio_array, sr=16000):
    if not speaker_id_available or not enrolled_speakers:
        return "unknown", 0.0
    signal = torch.tensor(audio_array).unsqueeze(0).to(device)
    with torch.no_grad():
        emb = speaker_encoder.encode_batch(signal).squeeze().cpu().numpy()
    del signal
    best_speaker, best_score = "unknown", -1
    for speaker, ref_emb in enrolled_speakers.items():
        score = cosine_similarity(emb.reshape(1, -1), ref_emb.reshape(1, -1))[0][0]
        if score > best_score:
            best_score = score
            best_speaker = speaker
    return best_speaker, float(best_score)

def match_to_vocabulary(predicted_text, v_list):
    predicted_clean = strip_diacritics(predicted_text)
    if not predicted_clean:
        return v_list[0] if v_list else "", 1.0
    best_match, best_score = predicted_clean, float("inf")
    for vocab_word in v_list:
        dist = Levenshtein.distance(predicted_clean, vocab_word)
        norm_dist = dist / max(len(predicted_clean), len(vocab_word), 1)
        if norm_dist < best_score:
            best_score = norm_dist
            best_match = vocab_word
    return best_match, best_score

def compute_lm_score(text):
    if derja_lm is None or len(text.strip()) < 2:
        return 0.0
    try:
        inputs = derja_lm_tokenizer(text, return_tensors="pt", truncation=True, max_length=64)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = derja_lm(**inputs, labels=inputs["input_ids"])
        return -outputs.loss.item()
    except Exception:
        return 0.0

def transcribe_audio(audio_array, sr=16000):
    speaker, spk_confidence = identify_speaker(audio_array)
    inputs = processor(audio_array, sampling_rate=sr, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = whisper_model.generate(
            **inputs, max_new_tokens=128,
            num_beams=1, num_return_sequences=1,
        )
    raw_candidates = []
    for i in range(outputs.shape[0]):
        text = processor.decode(outputs[i], skip_special_tokens=True).strip()
        if text and text not in raw_candidates:
            raw_candidates.append(text)
    del inputs, outputs
    if not raw_candidates:
        raw_candidates = [""]

    best_candidate = raw_candidates[0]
    best_score = -float("inf")
    best_vocab_match = ""
    best_edit_dist = 1.0

    if vocab_clean:
        for candidate in raw_candidates:
            vm, ed = match_to_vocabulary(candidate, vocab_clean)
            lm_score = compute_lm_score(candidate)
            combined = lm_score - ed * 5.0
            if combined > best_score:
                best_score = combined
                best_candidate = candidate
                best_vocab_match = vm
                best_edit_dist = ed

    whisper_raw = best_candidate
    vocab_match = best_vocab_match
    edit_dist = best_edit_dist
    original_text = vocab_original.get(vocab_match, vocab_match)
    in_vocabulary = edit_dist < 0.5

    try:
        print(f'  [Transcribe] Best: "{whisper_raw}" | Match: "{vocab_match}" (dist={edit_dist:.2f})')
    except UnicodeEncodeError:
        print(f"  [Transcribe] dist={edit_dist:.2f}, in_vocab={in_vocabulary}")

    return {
        "speaker": speaker,
        "confidence": spk_confidence,
        "whisper_raw": whisper_raw,
        "recognized": vocab_match,
        "vocab_match": vocab_match,
        "original_text": original_text,
        "edit_dist": round(edit_dist, 3),
        "in_vocabulary": in_vocabulary,
        "all_candidates": raw_candidates[:5],
    }

# ============================================================
# PRONUNCIATION SCORING
# ============================================================
from gtts import gTTS
from pydub import AudioSegment

GOOD_THRESHOLD = 45
OK_THRESHOLD = 20

AR_TO_IPA = {
    "ب": "b", "ت": "t", "ث": "θ", "ج": "dʒ",
    "ح": "ħ", "خ": "x", "د": "d", "ذ": "ð",
    "ر": "r", "ز": "z", "س": "s", "ش": "ʃ",
    "ص": "sˤ", "ض": "dˤ", "ط": "tˤ", "ظ": "ðˤ",
    "ع": "ʕ", "غ": "ɣ", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n",
    "ه": "h", "و": "w", "ي": "j",
    "ا": "a", "آ": "aː", "أ": "ʔ", "إ": "ʔ",
    "ء": "ʔ", "ة": "a", "ى": "a",
}

IPA_TO_AR = {v: k for k, v in AR_TO_IPA.items()}
IPA_TO_AR.update({"i": "ي", "u": "و", "ɡ": "غ", "ɖ": "ض"})

CONSONANTS = set("بتثجحخدذرزسشصضطظعغفقكلمنهء")

_tts_cache = {}

def word_to_phonemes(word):
    clean = normalize_arabic(word)
    phonemes = []
    for idx, ch in enumerate(clean):
        if ch == "و":
            prev_is_cons = idx > 0 and clean[idx - 1] in CONSONANTS
            if prev_is_cons:
                phonemes.append("u")
            else:
                phonemes.append("w")
        elif ch == "ي":
            prev_is_cons = idx > 0 and clean[idx - 1] in CONSONANTS
            next_is_cons = idx < len(clean) - 1 and clean[idx + 1] in CONSONANTS
            if prev_is_cons and next_is_cons:
                phonemes.append("i")
            else:
                phonemes.append("j")
        elif ch in AR_TO_IPA:
            phonemes.append(AR_TO_IPA[ch])
    return phonemes

def ipa_to_arabic(ipa):
    return IPA_TO_AR.get(ipa, ipa)

PHONEME_FALLBACK = {
    "tˤ": "t", "sˤ": "s", "ðˤ": "ð",
    "dˤ": "d", "dʒ": "d", "aː": "a",
}

def _phonemes_to_ids(phonemes):
    ids, kept = [], []
    for p in phonemes:
        if p in w2v_vocab:
            ids.append(w2v_vocab[p])
            kept.append(p)
        elif p in PHONEME_FALLBACK and PHONEME_FALLBACK[p] in w2v_vocab:
            fb = PHONEME_FALLBACK[p]
            ids.append(w2v_vocab[fb])
            kept.append(fb)
    return ids, kept

def _ctc_forced_align(log_probs, target_ids, blank_id):
    T, V = log_probs.shape
    ext = [blank_id]
    for t in target_ids:
        ext.append(t)
        ext.append(blank_id)
    S = len(ext)
    dp = np.full((T, S), float('-inf'), dtype=np.float64)
    bp = np.full((T, S), -1, dtype=np.int32)
    dp[0, 0] = log_probs[0, ext[0]]
    if S > 1:
        dp[0, 1] = log_probs[0, ext[1]]
    for t in range(1, T):
        for s in range(S):
            best, prev = dp[t - 1, s], s
            if s - 1 >= 0 and dp[t - 1, s - 1] > best:
                best, prev = dp[t - 1, s - 1], s - 1
            if s - 2 >= 0 and ext[s] != blank_id and ext[s] != ext[s - 2] and dp[t - 1, s - 2] > best:
                best, prev = dp[t - 1, s - 2], s - 2
            dp[t, s] = best + log_probs[t, ext[s]]
            bp[t, s] = prev
    last = S - 1 if dp[T - 1, S - 1] >= dp[T - 1, S - 2] else S - 2
    path = [last]
    for t in range(T - 1, 0, -1):
        path.append(bp[t, path[-1]])
    path.reverse()
    spans = []
    i = 0
    while i < T:
        s = path[i]
        if ext[s] != blank_id:
            phon_idx = (s - 1) // 2
            j = i
            while j < T and path[j] == s:
                j += 1
            spans.append((phon_idx, i, j - 1))
            i = j
        else:
            i += 1
    return spans

def get_reference_audio(word):
    if word in _tts_cache:
        return _tts_cache[word]
    clean = strip_diacritics(word)
    ref_path = REF_AUDIO_DIR / f'{clean.replace(" ", "_")}.wav'
    if ref_path.exists():
        audio, _ = librosa.load(str(ref_path), sr=16000)
        _tts_cache[word] = audio
        return audio
    try:
        tts = gTTS(text=word.replace("ة", "ا"), lang="ar", slow=True)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        seg = AudioSegment.from_mp3(buf).set_frame_rate(16000).set_channels(1)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
        _tts_cache[word] = samples
        return samples
    except:
        return np.zeros(8000, dtype=np.float32)

def align_and_score(audio_array, sampling_rate, target_phonemes):
    if not w2v_available:
        return []
    target_ids, kept = _phonemes_to_ids(target_phonemes)
    if not target_ids:
        return []
    inputs = w2v_processor(audio_array, sampling_rate=sampling_rate, return_tensors="pt")
    input_values = inputs.input_values.to(device)
    with torch.no_grad():
        logits = w2v_model(input_values).logits[0]
        log_probs = F.log_softmax(logits, dim=-1).cpu().numpy()
    del input_values, inputs, logits
    spans = _ctc_forced_align(log_probs, target_ids, w2v_blank_id)
    frame_dur = 320 / 16000
    results = []
    for phon_idx, s, e in spans:
        phon = kept[phon_idx]
        avg_lp = float(np.mean(log_probs[s : e + 1, target_ids[phon_idx]]))
        score = max(0.0, min(100.0, (avg_lp + 5) / 5 * 100))
        results.append({
            "phoneme": phon,
            "arabic": ipa_to_arabic(phon),
            "start_sec": round(s * frame_dur, 3),
            "end_sec": round((e + 1) * frame_dur, 3),
            "gop": round(score, 1),
        })
    return results

def assess_pronunciation(audio_array, sampling_rate, target_word):
    phonemes = word_to_phonemes(target_word)
    print(f"  [Pronounce] Target: {len(phonemes)} phonemes, Audio: {len(audio_array)/sampling_rate:.2f}s")

    if not phonemes:
        return {"error": "Could not extract phonemes"}

    if not w2v_available:
        return {
            "target_word": target_word,
            "phoneme_scores": [],
            "overall_score": 50.0,
            "tone_match": 50.0,
            "passed": False,
            "weak_phonemes": [],
            "ok_phonemes": [],
            "feedback": "Phoneme scoring unavailable",
        }

    scores = align_and_score(audio_array, sampling_rate, phonemes)
    if not scores:
        return {"error": "Alignment failed"}

    overall = round(sum(s["gop"] for s in scores) / len(scores), 1)
    min_score = min(s["gop"] for s in scores)

    for s in scores:
        if s["gop"] >= GOOD_THRESHOLD:
            s["status"] = "good"
            s["stars"] = 3
        elif s["gop"] >= OK_THRESHOLD:
            s["status"] = "ok"
            s["stars"] = 2
        else:
            s["status"] = "weak"
            s["stars"] = 1

    weak = [s for s in scores if s["status"] == "weak"]
    ok_ph = [s for s in scores if s["status"] == "ok"]

    passed = overall >= GOOD_THRESHOLD and len(weak) == 0 and min_score >= OK_THRESHOLD

    score_detail = " ".join(f"{s['phoneme']}={s['gop']:.0f}" for s in scores)
    print(f"  [Pronounce] [{score_detail}] overall={overall} min={min_score:.0f} passed={passed}")

    weak_letters = ", ".join(s["arabic"] for s in weak[:3])
    not_good = [s for s in scores if s["status"] != "good"]
    not_good_letters = ", ".join(s["arabic"] for s in not_good[:3])
    if passed:
        feedback = "Excellent pronunciation!"
    elif overall >= OK_THRESHOLD and not weak:
        feedback = f"Good effort! Practice these sounds: {not_good_letters}" if not_good_letters else "Good effort! Keep practicing!"
    else:
        feedback = f"Keep trying! Focus on: {weak_letters}" if weak_letters else "Keep trying! Listen and repeat."

    return {
        "target_word": target_word,
        "phoneme_scores": scores,
        "overall_score": overall,
        "tone_match": 50.0,
        "passed": bool(passed),
        "weak_phonemes": [{"phoneme": w["phoneme"], "arabic": w["arabic"], "gop": w["gop"]} for w in weak],
        "ok_phonemes": [{"phoneme": o["phoneme"], "arabic": o["arabic"], "gop": o["gop"]} for o in ok_ph],
        "feedback": feedback,
    }

# ============================================================
# AUDIO HELPER
# ============================================================
FFMPEG_BIN = None
for _candidate in [
    "ffmpeg",
    r"C:\Users\baraa\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe",
]:
    try:
        subprocess.run([_candidate, "-version"], capture_output=True, timeout=5)
        FFMPEG_BIN = _candidate
        break
    except Exception:
        continue
if FFMPEG_BIN:
    print(f"  ffmpeg found: {FFMPEG_BIN}")
else:
    print("  WARNING: ffmpeg not found — audio decoding may fail for non-wav formats")

def load_audio_from_upload(contents: bytes) -> np.ndarray:
    tmp_in = os.path.join(tempfile.gettempdir(), f"asr_{os.getpid()}_{id(contents)}.bin")
    tmp_wav = tmp_in + ".wav"
    with open(tmp_in, "wb") as f:
        f.write(contents)
    try:
        if FFMPEG_BIN:
            subprocess.run(
                [FFMPEG_BIN, "-y", "-i", tmp_in, "-ar", "16000", "-ac", "1", tmp_wav],
                capture_output=True, timeout=15,
            )
            audio_array, _ = sf.read(tmp_wav, dtype="float32")
        else:
            audio_array, _ = sf.read(tmp_in, dtype="float32")
    except Exception:
        seg = AudioSegment.from_file(tmp_in)
        seg = seg.set_frame_rate(TARGET_SR).set_channels(1)
        audio_array = np.array(seg.get_array_of_samples(), dtype=np.float32) / 32768.0
    finally:
        for p in [tmp_in, tmp_wav]:
            try:
                os.unlink(p)
            except OSError:
                pass

    if len(audio_array) < 1600:
        raise ValueError("Recording too short")

    trimmed, _ = librosa.effects.trim(audio_array, top_db=25)
    if len(trimmed) < TARGET_SR * 0.05:
        trimmed = audio_array

    return trimmed

# ============================================================
# FASTAPI SERVER
# ============================================================
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import traceback

app = FastAPI(title="Beyond 21 ASR API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    adapter_loaded = hasattr(whisper_model, "peft_config")
    return {
        "status": "ok", "device": device, "fine_tuned": adapter_loaded,
        "server": "asr", "speaker_id": speaker_id_available,
        "pronunciation": w2v_available, "lm_rescoring": derja_lm is not None,
    }

@app.get("/api/vocabulary")
def get_vocabulary():
    words = []
    for entry in vocab_entries:
        words.append({
            "original": entry["original"],
            "clean": entry["clean"],
            "is_sentence": entry["is_sentence"],
            "has_reference_audio": entry["clean"] in ref_audio_map,
        })
    return {"vocabulary": words, "total": len(words)}

@app.get("/api/reference-audio/{word}")
def get_ref_audio(word: str):
    clean = strip_diacritics(word)
    if clean in ref_audio_map:
        return FileResponse(ref_audio_map[clean], media_type="audio/wav")
    ref = get_reference_audio(word)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(tmp.name, ref, 16000)
    return FileResponse(tmp.name, media_type="audio/wav")

@app.post("/api/transcribe")
def api_transcribe(audio: UploadFile = File(...)):
    try:
        contents = audio.file.read()
        audio_array = load_audio_from_upload(contents)
        result = transcribe_audio(audio_array, TARGET_SR)
        return result
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

@app.post("/api/pronounce")
def api_pronounce(
    audio: UploadFile = File(...),
    target_word: str = Form(...),
):
    try:
        contents = audio.file.read()
        audio_array = load_audio_from_upload(contents)
        result = assess_pronunciation(audio_array, TARGET_SR, target_word)
        return result
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

@app.post("/api/enroll")
def api_enroll(
    audio: UploadFile = File(...),
    word: str = Form(...),
    speaker_id: str = Form(default="child_01"),
):
    try:
        contents = audio.file.read()
        audio_array = load_audio_from_upload(contents)
        spk_dir = ENROLL_DIR / speaker_id
        spk_dir.mkdir(exist_ok=True)
        clean_word = strip_diacritics(word).replace(" ", "_")
        existing = [f for f in os.listdir(spk_dir) if f.startswith(clean_word)]
        idx = len(existing)
        filename = f"{clean_word}_{idx:03d}.wav"
        save_path = spk_dir / filename
        sf.write(str(save_path), audio_array, TARGET_SR)

        if speaker_id_available:
            signal = torch.tensor(audio_array).unsqueeze(0).to(device)
            with torch.no_grad():
                emb = speaker_encoder.encode_batch(signal).squeeze().cpu().numpy()
            del signal
            if speaker_id in enrolled_speakers:
                enrolled_speakers[speaker_id] = 0.9 * enrolled_speakers[speaker_id] + 0.1 * emb
            else:
                enrolled_speakers[speaker_id] = emb
            with open(emb_path, "wb") as f:
                pickle.dump(enrolled_speakers, f)

        total = sum(
            len(os.listdir(ENROLL_DIR / d))
            for d in os.listdir(ENROLL_DIR)
            if (ENROLL_DIR / d).is_dir()
        )
        return {"status": "saved", "speaker_id": speaker_id, "word": word, "file": filename, "total_recordings": total}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

training_status = {"is_training": False, "progress": "complete", "speaker": None}

@app.post("/api/train")
def api_train(speaker_id: str = Form(default="child_01")):
    return {"status": "complete", "message": "Speaker profile updated"}

@app.get("/api/train/status")
def api_train_status():
    return training_status

@app.get("/api/enrolled")
def api_enrolled():
    speakers = {}
    if ENROLL_DIR.exists():
        for d in os.listdir(ENROLL_DIR):
            spk_path = ENROLL_DIR / d
            if spk_path.is_dir():
                files = [f for f in os.listdir(spk_path) if f.endswith(".wav")]
                words = set(f.rsplit("_", 1)[0].replace("_", " ") for f in files)
                speakers[d] = {
                    "total_recordings": len(files),
                    "unique_words": len(words),
                    "has_adapter": False,
                }
    return {"speakers": speakers}

# ============================================================
# START
# ============================================================
if __name__ == "__main__":
    import uvicorn

    PORT = 8001
    print("=" * 55)
    print("  BEYOND 21 — ASR SERVER")
    print("=" * 55)
    print(f"  URL:  http://localhost:{PORT}")
    print(f"  Docs: http://localhost:{PORT}/docs")
    print(f"  Adapter: {HF_ADAPTER}")
    print("=" * 55)
    print()

    uvicorn.run(app, host="0.0.0.0", port=PORT)
