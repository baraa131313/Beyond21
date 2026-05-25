AI-Driven Cognitive and Interactive Learning Framework for Individuals with Down Syndrome

Overview

This project presents a comprehensive AI-driven framework designed to support individuals with Down Syndrome

Unlike single-task systems, this solution integrates multiple AI modules to address:

Communication difficulties
Learning challenges
Emotional monitoring
Medical analysis
The goal is to deliver a unified, adaptive, and intelligent assistive system for both users and caregivers.

Key Features

Speech assistance and pronunciation correction
Adaptive and personalized learning
Emotion and behavior monitoring
Brain MRI anomaly detection
Explainable AI for transparency
Complete AI Solutions

Speech & Communication Solution
This module improves communication abilities by:

Using Whisper for speech recognition

Handling unintelligible or atypical speech

Detecting mispronunciations using:

GOP (Goodness of Pronunciation)
CTC alignment
Providing real-time pronunciation correction

Adaptive Learning Solution
This module personalizes the learning experience:

Reinforcement Learning (DQN)
Neutrosophic + Fuzzy clustering
Dynamic difficulty adaptation
Learner profiling based on performance
Emotion & Behavior Solution
This module monitors user state:

Facial emotion recognition (EfficientNet + Transformer)

Detection of:

Frustration
Engagement
Attention tracking (eye tracking)

Behavioral data logging

Medical Analysis Solution
This module provides clinical insights:

Brain MRI anomaly detection
Diffusion models (DDPM / DDIM)
Reconstruction of normal-like MRI
Heatmap-based anomaly localization
Explainable AI Solution
Ensures transparency of AI decisions:

Grad-CAM visualization

Highlights important brain regions:

Hippocampus
Cerebellum
Cortex
Ventricles
Global System Workflow

Input:

Speech
Images (face)
Behavioral signals
MRI scans
Processing:

Each module analyzes its modality
Adaptation:

Learning adjusts in real-time
Feedback is generated
Output:

Speech correction
Learning recommendations
Emotion state
Medical insights
Tech Stack

AI / Deep Learning: PyTorch, TensorFlow
Speech: Whisper, wav2vec2
Vision: EfficientNet, MediaPipe
Diffusion Models: DDPM, DDIM
Backend: FastAPI
Frontend: React + TypeScript
Dataset

Module	Data Type	Size
Speech	Audio (Tunisian dialect)	536 samples
Emotion	Facial images	1005 images
MRI	Brain scans	4756 EU + 111 DS
Behavioral	Interaction logs	Ongoing
Challenges

Limited datasets (especially Down Syndrome)
Multimodal integration complexity
Real-time processing constraints
Ethics

Data anonymization
User consent
Human supervision
Future Work

Deployment in real environments
Larger datasets
Improved personalization
Clinical validation

## Live Demo

Our platform is available online and accessible through Railway:

[Visit our website](https://frontend-production-ce37.up.railway.app/)

---

## Run Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- ffmpeg (for audio processing)
- eSpeak NG (for phoneme extraction)

#### Install ffmpeg

**Windows:**
```
winget install Gyan.FFmpeg
```

**Linux:**
```
sudo apt install ffmpeg
```

**macOS:**
```
brew install ffmpeg
```

#### Install eSpeak NG

**Windows:** Download from https://github.com/espeak-ng/espeak-ng/releases

**Linux:**
```
sudo apt install espeak-ng
```

**macOS:**
```
brew install espeak-ng
```

### 1. Clone the repository

```
git clone https://github.com/baraa131313/Beyond21.git
cd Beyond21
```

### 2. Backend setup

```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

### 3. Frontend setup

```
cd Frontend
npm install
```

### 4. Environment variables (optional)

Create `backend/.env`:
```
DATABASE_URL=sqlite:///./app.db
GROQ_API_KEY=your_groq_key
ESPEAK_DIR=C:\Program Files\eSpeak NG
FFMPEG_DIR=C:\path\to\ffmpeg\bin
```

If ffmpeg and eSpeak NG are on your system PATH, no env vars are needed.

### 5. Running

Open three terminals:

**Terminal 1 - Backend API:**
```
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - ASR Server:**
```
cd backend
python asr_server.py
```
On first run, models download automatically from HuggingFace (~5 GB total). This takes a few minutes.

**Terminal 3 - Frontend:**
```
cd Frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### ML Models (auto-downloaded)

| Model | Source | Purpose |
|-------|--------|---------|
| openai/whisper-large-v3-turbo | HuggingFace | Base ASR |
| zienebo/ds-asr-tunisian | HuggingFace | Tunisian LoRA adapter |
| facebook/wav2vec2-xlsr-53-espeak-cv-ft | HuggingFace | Pronunciation scoring |
| speechbrain/spkrec-ecapa-voxceleb | HuggingFace | Speaker identification |

---

## About the Project

This project was developed with passion and dedication to create an inclusive educational experience for children with Down syndrome.

We hope our solution can make learning more engaging, interactive, and accessible for every child.

---

## Team

Developed by our team as part of our academic and innovation journey.
