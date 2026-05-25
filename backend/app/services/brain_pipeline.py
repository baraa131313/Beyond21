"""Brain anomaly detection pipeline for DS MRI inference.
Architecture exactement identique a la notebook Brain__7_.ipynb
"""

import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import base64
import io
import math
from dataclasses import dataclass

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from huggingface_hub import hf_hub_download
from PIL import Image
from scipy.ndimage import binary_erosion, binary_fill_holes, gaussian_filter, label
from skimage.exposure import match_histograms


# ─────────────────────────────────────────────
# 1. ARCHITECTURE UNET (identique a la notebook)
# ─────────────────────────────────────────────

class SinusoidalPosEmb(nn.Module):
    """Sinusoidal timestep embedding — identique notebook."""

    def __init__(self, dim: int):
        super().__init__()
        self.dim = dim

    def forward(self, t: torch.Tensor) -> torch.Tensor:
        device = t.device
        half_dim = self.dim // 2
        emb = math.log(10000) / (half_dim - 1)
        emb = torch.exp(torch.arange(half_dim, device=device) * -emb)
        emb = t[:, None] * emb[None, :]
        return torch.cat((emb.sin(), emb.cos()), dim=-1)


class ResBlock(nn.Module):
    """UNet residual block — identique notebook."""

    def __init__(self, in_ch: int, out_ch: int, temb_dim: int):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, padding=1)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1)
        self.emb   = nn.Linear(temb_dim, out_ch)
        self.norm1 = nn.GroupNorm(8, out_ch)
        self.norm2 = nn.GroupNorm(8, out_ch)
        self.act   = nn.SiLU()
        self.skip  = nn.Conv2d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()

    def forward(self, x: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
        h = self.act(self.norm1(self.conv1(x)))
        h = h + self.emb(t)[:, :, None, None]
        h = self.act(self.norm2(self.conv2(h)))
        return h + self.skip(x)


class UNet(nn.Module):
    """UNet pour le debruitage DDPM/DDIM — identique notebook."""

    def __init__(self, in_ch: int = 1, base: int = 32, temb_dim: int = 128):
        super().__init__()
        c1, c2, c3, c4 = base, base * 2, base * 4, base * 8

        # ✅ temb_mlp avec SinusoidalPosEmb(base=32) comme dans la notebook
        self.temb_mlp = nn.Sequential(
            SinusoidalPosEmb(base),
            nn.Linear(base, temb_dim),
            nn.SiLU(),
            nn.Linear(temb_dim, temb_dim),
        )

        self.init_conv = nn.Conv2d(in_ch, c1, 3, padding=1)

        self.down1 = ResBlock(c1, c2, temb_dim)
        self.pool1 = nn.Conv2d(c2, c2, 4, 2, 1)

        self.down2 = ResBlock(c2, c3, temb_dim)
        self.pool2 = nn.Conv2d(c3, c3, 4, 2, 1)

        self.down3 = ResBlock(c3, c4, temb_dim)
        self.pool3 = nn.Conv2d(c4, c4, 4, 2, 1)

        self.mid1 = ResBlock(c4, c4, temb_dim)
        self.mid2 = ResBlock(c4, c4, temb_dim)

        self.up3    = nn.Sequential(nn.Upsample(scale_factor=2), nn.Conv2d(c4, c3, 3, padding=1))
        self.upres3 = ResBlock(c3 + c4, c3, temb_dim)

        self.up2    = nn.Sequential(nn.Upsample(scale_factor=2), nn.Conv2d(c3, c2, 3, padding=1))
        self.upres2 = ResBlock(c2 + c3, c2, temb_dim)

        self.up1    = nn.Sequential(nn.Upsample(scale_factor=2), nn.Conv2d(c2, c1, 3, padding=1))
        self.upres1 = ResBlock(c1 + c2, c1, temb_dim)

        self.out_norm = nn.GroupNorm(8, c1)
        self.out_conv = nn.Conv2d(c1, in_ch, 1)

    def forward(self, x: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
        te = self.temb_mlp(t)

        x0 = self.init_conv(x)

        x1 = self.down1(x0, te); d1 = x1; x1 = self.pool1(x1)
        x2 = self.down2(x1, te); d2 = x2; x2 = self.pool2(x2)
        x3 = self.down3(x2, te); d3 = x3; x3 = self.pool3(x3)

        x3 = self.mid2(self.mid1(x3, te), te)

        x3 = self.upres3(torch.cat([self.up3(x3), d3], dim=1), te)
        x3 = self.upres2(torch.cat([self.up2(x3), d2], dim=1), te)
        x3 = self.upres1(torch.cat([self.up1(x3), d1], dim=1), te)

        return self.out_conv(F.silu(self.out_norm(x3)))


# ─────────────────────────────────────────────
# 2. CLASSIFIER (identique notebook)
# ─────────────────────────────────────────────

class DiffusionClassifier(nn.Module):
    """Classifier EU=0 / DS=1 pour guider le debruitage DDIM."""

    def __init__(self, base: int = 32, temb_dim: int = 128):
        super().__init__()
        self.temb = nn.Sequential(
            SinusoidalPosEmb(base),
            nn.Linear(base, temb_dim),
            nn.SiLU(),
        )
        self.encoder = nn.Sequential(
            nn.Conv2d(1, base,      3, 2, 1), nn.GroupNorm(8, base),      nn.SiLU(),
            nn.Conv2d(base, base*2, 3, 2, 1), nn.GroupNorm(8, base*2),    nn.SiLU(),
            nn.Conv2d(base*2, base*4, 3, 2, 1), nn.GroupNorm(8, base*4),  nn.SiLU(),
            nn.Conv2d(base*4, base*8, 3, 2, 1), nn.GroupNorm(8, base*8),  nn.SiLU(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.head = nn.Linear(base * 8 + temb_dim, 2)

    def forward(self, x: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
        feat = self.encoder(x).flatten(1)       # (B, 256)
        te   = self.temb(t)                      # (B, 128)
        return self.head(torch.cat([feat, te], 1))


# ─────────────────────────────────────────────
# 3. DDPM (identique notebook)
# ─────────────────────────────────────────────

class DDPM:
    """Noise schedule DDPM/DDIM."""

    def __init__(self, T: int = 1000, device: str = "cpu"):
        self.T      = T
        self.device = device
        b  = torch.linspace(1e-4, 0.02, T)
        a  = 1 - b
        ab = torch.cumprod(a, 0)
        self.betas      = b.to(device)
        self.alphas     = a.to(device)
        self.alpha_bar  = ab.to(device)

    def ddim_timesteps(self, L: int) -> list:
        step = self.T // L
        return list(range(0, self.T, step))


# ─────────────────────────────────────────────
# 4. GRADCAM (identique notebook — deterministe)
# ─────────────────────────────────────────────

class GradCAM_UNet:
    """GradCAM deterministe base sur l'anomaly map — identique notebook."""

    def __init__(self, model: nn.Module):
        self.model = model

    def generate(
        self,
        xt: torch.Tensor,
        t: torch.Tensor,
        brain_mask: np.ndarray | None = None,
        anomaly_map: np.ndarray | None = None,
    ) -> np.ndarray:
        if anomaly_map is None:
            return np.zeros((128, 128))

        cam = anomaly_map.copy()
        cam = gaussian_filter(cam, sigma=3)

        if brain_mask is not None:
            cam[~brain_mask] = 0.0
            brain_cam = cam[brain_mask]
            if brain_cam.max() > 0:
                p10 = np.percentile(brain_cam, 10)
                p99 = np.percentile(brain_cam, 99)
                cam = np.clip((cam - p10) / (p99 - p10 + 1e-8), 0, 1)
                cam = np.power(cam, 0.5)
            cam[~brain_mask] = 0.0

        return cam


# ─────────────────────────────────────────────
# 5. FONCTIONS PIPELINE (identiques notebook)
# ─────────────────────────────────────────────

def get_brain_mask(image_np: np.ndarray, threshold: float = 0.18) -> np.ndarray:
    """Extrait le masque du cerveau — identique notebook."""
    mask = image_np > threshold
    labeled_arr, n = label(mask)
    if n > 1:
        sizes = [(labeled_arr == i).sum() for i in range(1, n + 1)]
        largest = np.argmax(sizes) + 1
        mask = labeled_arr == largest
    mask = binary_fill_holes(mask)
    mask = binary_erosion(mask, iterations=2)
    return mask.astype(bool)


def ddim_inversion(x0: torch.Tensor, model: nn.Module, ddpm: DDPM, L: int = 200) -> torch.Tensor:
    """Encode x0 → xT — identique notebook."""
    model.eval()
    device    = x0.device
    timesteps = ddpm.ddim_timesteps(L)
    xt        = x0.clone().to(device)

    for i in range(len(timesteps) - 1):
        t_curr = timesteps[i]
        t_next = timesteps[i + 1]
        t_t    = torch.tensor([t_curr], device=device, dtype=torch.long)

        with torch.no_grad():
            eps = model(xt, t_t)

        ab_c    = ddpm.alpha_bar[t_curr]
        ab_n    = ddpm.alpha_bar[t_next]
        x0_pred = ((xt - (1 - ab_c).sqrt() * eps) / ab_c.sqrt()).clamp(-1, 1)
        xt      = ab_n.sqrt() * x0_pred + (1 - ab_n).sqrt() * eps

    return xt


def ddim_guided_denoising(
    xT: torch.Tensor,
    model: nn.Module,
    classifier: nn.Module,
    ddpm: DDPM,
    L: int = 200,
    guidance_scale: float = 3.0,
) -> torch.Tensor:
    """Debruite xT → x0 avec guidance EU — identique notebook."""
    model.eval()
    device    = xT.device
    timesteps = list(reversed(ddpm.ddim_timesteps(L)))
    xt        = xT.clone().to(device)

    for i in range(len(timesteps) - 1):
        t_curr = timesteps[i]
        t_prev = timesteps[i + 1]
        t_t    = torch.tensor([t_curr], device=device, dtype=torch.long)

        # Gradient du classifier
        xt_g  = xt.detach().requires_grad_(True)
        logit = classifier(xt_g, t_t)
        log_p = F.log_softmax(logit, dim=-1)[:, 0]
        grad  = torch.autograd.grad(log_p.sum(), xt_g)[0].detach()

        # Prediction bruit UNet
        with torch.no_grad():
            eps = model(xt, t_t)

        # Eps guide
        ab_c  = ddpm.alpha_bar[t_curr]
        eps_g = eps - guidance_scale * (1 - ab_c).sqrt() * grad

        # Pas DDIM
        ab_p    = ddpm.alpha_bar[t_prev]
        x0_pred = ((xt - (1 - ab_c).sqrt() * eps_g) / ab_c.sqrt()).clamp(-1, 1)
        xt      = ab_p.sqrt() * x0_pred + (1 - ab_p).sqrt() * eps_g

    return xt.clamp(-1, 1)


def histogram_matching(reconstruction: torch.Tensor, original: torch.Tensor) -> torch.Tensor:
    """Histogram matching post-traitement — identique notebook."""
    device  = original.device
    rec_np  = ((reconstruction.squeeze().cpu().numpy() + 1) / 2).clip(0, 1)
    orig_np = ((original.squeeze().cpu().numpy() + 1) / 2).clip(0, 1)
    matched = match_histograms(rec_np, orig_np)
    matched_t = torch.from_numpy((matched * 2 - 1).astype(np.float32))
    return matched_t.unsqueeze(0).unsqueeze(0).to(device)


def compute_anomaly_map(
    original: torch.Tensor,
    reconstruction_hm: torch.Tensor,
    smooth_sigma: float = 2.0,
) -> tuple[np.ndarray, np.ndarray]:
    """Calcule l'anomaly map normalisee — identique notebook."""
    orig_np = original.squeeze().cpu().numpy()
    rec_np  = reconstruction_hm.squeeze().cpu().numpy()

    # Brain mask
    orig_01    = (orig_np + 1) / 2
    brain_mask = get_brain_mask(orig_01)

    # Difference lissee
    diff        = np.abs(orig_np - rec_np)
    diff_smooth = gaussian_filter(diff, sigma=smooth_sigma)
    diff_smooth = diff_smooth * brain_mask

    # Normalisation
    brain_pixels = diff_smooth[brain_mask]
    if brain_pixels.max() > 0:
        amap = diff_smooth / (brain_pixels.max() + 1e-8)
    else:
        amap = diff_smooth

    return np.clip(amap, 0, 1), brain_mask


# ─────────────────────────────────────────────
# 6. HELPERS PNG / IMAGE
# ─────────────────────────────────────────────

def numpy_heatmap_to_base64(array: np.ndarray, cmap_name: str = "hot") -> str:
    """Convertit un numpy array [0,1] en PNG base64 colore (hot/jet)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(2, 2), dpi=64)
    ax.imshow(array, cmap=cmap_name, vmin=0, vmax=1)
    ax.axis("off")
    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"


def numpy_gradcam_to_base64(cam: np.ndarray, orig_np: np.ndarray, brain_mask: np.ndarray) -> str:
    """GradCAM colore (jet) superpose sur l'original — identique notebook."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    cam_masked = cam.copy().astype(float)
    cam_masked[~brain_mask] = np.nan

    cmap_jet = plt.get_cmap("jet").copy()
    cmap_jet.set_bad(alpha=0)

    fig, ax = plt.subplots(figsize=(2, 2), dpi=64)
    ax.imshow(orig_np, cmap="gray")
    ax.imshow(cam_masked, cmap=cmap_jet, alpha=0.6, vmin=0, vmax=1, interpolation="bilinear")
    ax.axis("off")
    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"


def tensor_to_base64_png(tensor: torch.Tensor) -> str:
    """Tensor [-1,1] → PNG base64 niveaux de gris."""
    pixels = (
        tensor.clamp(-1.0, 1.0).add(1.0).div(2.0).mul(255.0)
        .round().to(torch.uint8).squeeze().cpu().numpy()
    )
    image = Image.fromarray(pixels, mode="L")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"


def load_image_bytes(image_bytes: bytes, device: torch.device) -> torch.Tensor:
    with Image.open(io.BytesIO(image_bytes)) as image:
        image  = image.convert("L").resize((128, 128), Image.LANCZOS)
        array  = np.array(image, dtype=np.float32) / 255.0
        tensor = torch.from_numpy(array).unsqueeze(0).unsqueeze(0).to(device)
    return tensor * 2.0 - 1.0


# ─────────────────────────────────────────────
# 7. DATACLASS ReSULTAT
# ─────────────────────────────────────────────

@dataclass
class PredictionResult:
    score: float
    label: str
    anomaly_map: str       # PNG base64 colore (hot)
    reconstruction: str    # PNG base64 gris
    gradcam: str           # PNG base64 colore (jet)


# ─────────────────────────────────────────────
# 8. PIPELINE PRINCIPAL
# ─────────────────────────────────────────────

class BrainPipeline:
    """Pipeline complet identique a la notebook Brain__7_.ipynb."""

    def __init__(self) -> None:
        self.device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.diffusion  = DDPM(T=1000, device=str(self.device))
        self.unet       = None
        self.classifier = None

    def _ensure_models_loaded(self) -> None:
        if self.unet is None:
            self.unet = self._load_model(
                "zienebo/ds-brain-detection", "unet_diffusion.pth", UNet
            )
        if self.classifier is None:
            self.classifier = self._load_model(
                "zienebo/ds-brain-detection", "classifier.pth", DiffusionClassifier
            )

    def _load_model(self, repo_id: str, filename: str, model_cls: type) -> nn.Module:
        print(f"Loading {filename} from {repo_id}...")
        try:
            model_path = hf_hub_download(repo_id=repo_id, filename=filename)
            model      = model_cls().to(self.device)
            state      = torch.load(model_path, map_location=self.device)
            model.load_state_dict(state, strict=False)
            model.eval()
            print(f"✅ {filename} charge")
            return model
        except Exception as e:
            print(f"❌ Erreur chargement {filename}: {e}")
            raise

    def run_full_pipeline(
        self,
        image_bytes: bytes,
        L: int = 200,
        guidance_scale: float = 3.0,
    ) -> PredictionResult:
        self._ensure_models_loaded()

        # Charger l'image
        x0 = load_image_bytes(image_bytes, self.device)

        # [1/4] DDIM Inversion
        print("  [1/4] DDIM Inversion...")
        xT = ddim_inversion(x0, self.unet, self.diffusion, L=L)

        # [2/4] Guided Denoising
        print("  [2/4] Guided Denoising...")
        reconstruction = ddim_guided_denoising(
            xT, self.unet, self.classifier, self.diffusion,
            L=L, guidance_scale=guidance_scale,
        )

        # [3/4] Histogram Matching
        print("  [3/4] Histogram Matching...")
        rec_hm = histogram_matching(reconstruction, x0)

        # [4/4] Anomaly Map + GradCAM
        print("  [4/4] Anomaly Map + GradCAM...")
        amap, brain_mask = compute_anomaly_map(x0, rec_hm)

        gradcam_engine = GradCAM_UNet(self.unet)
        t_mid = torch.tensor([self.diffusion.T // 2], device=self.device, dtype=torch.long)
        cam_map = gradcam_engine.generate(x0, t_mid, brain_mask=brain_mask, anomaly_map=amap)

        # Score
        brain_pixels = amap[brain_mask] if brain_mask is not None else amap.ravel()
        score = float(brain_pixels.mean())
        label = "DS Detected" if score > 0.18 else "Normal"
        print(f"  Score: {score:.4f} → {label}")

        # Numpy original pour GradCAM overlay
        orig_np = ((x0.squeeze().cpu().numpy() + 1) / 2).clip(0, 1)

        return PredictionResult(
            score=round(score, 4),
            label=label,
            anomaly_map=numpy_heatmap_to_base64(amap, cmap_name="hot"),
            reconstruction=tensor_to_base64_png(rec_hm),
            gradcam=numpy_gradcam_to_base64(cam_map, orig_np, brain_mask),
        )


# Instance globale
brain_pipeline = BrainPipeline()