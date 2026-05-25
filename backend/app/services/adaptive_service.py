"""Adaptive learning service — FCM + Neutrosophic + DQN decision engine."""

import logging
import os

import numpy as np

log = logging.getLogger(__name__)

FEATURES = [
    "response_time",
    "error_rate",
    "hesitation_count",
    "focus_ratio",
    "frustration_score",
    "movement_intensity",
]

FEATURE_BOUNDS = {
    "response_time": (1.0, 60.0),
    "error_rate": (0.0, 1.0),
    "hesitation_count": (0.0, 15.0),
    "focus_ratio": (0.0, 1.0),
    "frustration_score": (0.0, 1.0),
    "movement_intensity": (0.0, 1.0),
}

ACTIONS = {0: "CONTINUE_LEVEL", 1: "PROVIDE_HINT", 2: "SENSORY_BREAK"}

ACTION_REASONS = {
    0: "T score is high — the learner is performing well.",
    1: "Low truth and low indeterminacy — genuine cognitive gap detected.",
    2: "High indeterminacy — fatigue or distraction detected.",
}

FUZZINESS = 2.0
N_CLUSTERS = 3


def _build_scaler():
    from sklearn.preprocessing import MinMaxScaler

    scaler = MinMaxScaler()
    bounds = np.array(
        [
            [FEATURE_BOUNDS[f][0] for f in FEATURES],
            [FEATURE_BOUNDS[f][1] for f in FEATURES],
        ]
    )
    scaler.fit(bounds)
    return scaler


def _build_fcm_centres(scaler):
    import skfuzzy as fuzz

    np.random.seed(42)
    N = 100

    def clip(a, lo, hi):
        return np.clip(a, lo, hi)

    prof = np.column_stack(
        [
            clip(np.random.normal(5.0, 1.2, N), 1, 60),
            clip(np.random.normal(0.08, 0.04, N), 0, 1),
            clip(np.random.normal(1.5, 1.0, N).astype(int), 0, 15),
            clip(np.random.normal(0.88, 0.07, N), 0, 1),
            clip(np.random.normal(0.10, 0.05, N), 0, 1),
            clip(np.random.normal(0.15, 0.07, N), 0, 1),
        ]
    )
    cog = np.column_stack(
        [
            clip(np.random.normal(22.0, 5.0, N), 1, 60),
            clip(np.random.normal(0.68, 0.12, N), 0, 1),
            clip(np.random.normal(8.5, 2.0, N).astype(int), 0, 15),
            clip(np.random.normal(0.75, 0.10, N), 0, 1),
            clip(np.random.normal(0.65, 0.12, N), 0, 1),
            clip(np.random.normal(0.22, 0.08, N), 0, 1),
        ]
    )
    fat = np.column_stack(
        [
            clip(np.random.normal(38.0, 9.0, N), 1, 60),
            clip(np.random.normal(0.50, 0.22, N), 0, 1),
            clip(np.random.normal(10.0, 2.5, N).astype(int), 0, 15),
            clip(np.random.normal(0.28, 0.10, N), 0, 1),
            clip(np.random.normal(0.38, 0.12, N), 0, 1),
            clip(np.random.normal(0.75, 0.12, N), 0, 1),
        ]
    )
    X = scaler.transform(np.vstack([prof, cog, fat]))
    cntr, _, _, _, _, _, _ = fuzz.cmeans(
        data=X.T, c=N_CLUSTERS, m=FUZZINESS, error=1e-6, maxiter=1000, init=None, seed=42
    )
    return cntr


def _identify_cluster_roles(cntr):
    rt_col = FEATURES.index("response_time")
    focus_col = FEATURES.index("focus_ratio")
    order = np.argsort(cntr[:, rt_col])
    remaining = list(order[1:])
    focus_vals = sorted((cntr[k, focus_col], k) for k in remaining)
    return {
        "optimal": int(focus_vals[1][1]),
        "cogap": int(focus_vals[1][1]),
        "fatigued": int(focus_vals[0][1]),
    }


def _compute_neutrosophic(u_new, cluster_roles, raw):
    T = float(u_new[cluster_roles["optimal"], 0])
    F = float(u_new[cluster_roles["cogap"], 0])
    uf = float(u_new[cluster_roles["fatigued"], 0])
    focus = float(raw["focus_ratio"])
    move = float(raw["movement_intensity"])
    frust = float(raw["frustration_score"])
    I_s = (1 - focus) * 0.5 + move * 0.3 + (1 - frust) * 0.2
    I = float(np.clip(0.6 * I_s + 0.4 * uf, 0, 1))
    return round(T, 4), round(I, 4), round(F, 4)


def _get_safety_action(t: float, i: float, f: float, dqn_action: int) -> tuple[int, str]:
    if f > 0.8:
        return 2, f"Safety override: F={f:.2f} (extreme frustration). DQN suggested {dqn_action}."
    if i > 0.4 and dqn_action == 0:
        return 1, f"Safety override: I={i:.2f} (high ambiguity). Escalating to Hint."
    if f > 0.6 and i > 0.5:
        return 2, f"Safety override: F={f:.2f} & I={i:.2f} elevated. Fatigue detected."
    return dqn_action, "DQN decision — no safety override triggered."


class AdaptiveEngine:
    def __init__(self):
        self._model = None
        self._scaler = None
        self._cntr = None
        self._cluster_roles = None

    def _ensure_loaded(self):
        if self._model is not None:
            return

        import skfuzzy as fuzz

        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
        os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
        import tensorflow as tf

        tf.get_logger().setLevel("ERROR")

        model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "student_dqn.keras",
        )
        log.info("Loading DQN model from %s", model_path)
        self._model = tf.keras.models.load_model(model_path)
        self._scaler = _build_scaler()
        self._cntr = _build_fcm_centres(self._scaler)
        self._cluster_roles = _identify_cluster_roles(self._cntr)
        log.info("Adaptive engine ready. Cluster roles: %s", self._cluster_roles)

    def predict(self, raw: dict) -> dict:
        import skfuzzy as fuzz

        self._ensure_loaded()

        x = np.array([[raw[f] for f in FEATURES]], dtype=np.float32)
        normed = self._scaler.transform(x)
        u_new, _, _, _, _, _ = fuzz.cmeans_predict(
            test_data=normed.T,
            cntr_trained=self._cntr,
            m=FUZZINESS,
            error=1e-6,
            maxiter=1000,
        )
        T, I, F = _compute_neutrosophic(u_new, self._cluster_roles, raw)

        q = self._model(np.array([[T, I, F]], dtype=np.float32), training=False).numpy()[0]
        dqn_action = int(np.argmax(q))
        expq = np.exp(q - np.max(q))
        conf = float(expq[dqn_action] / expq.sum())

        final_action, reason = _get_safety_action(T, I, F, dqn_action)
        action_name = ACTIONS[final_action]

        log.info("T=%.3f I=%.3f F=%.3f → %s (%.0f%%)", T, I, F, action_name, conf * 100)

        return {
            "action_id": final_action,
            "action_name": action_name,
            "reason": reason,
            "T": round(T, 4),
            "I": round(I, 4),
            "F": round(F, 4),
            "dqn_action_id": dqn_action,
            "override_applied": final_action != dqn_action,
            "q_values": {
                "CONTINUE_LEVEL": round(float(q[0]), 4),
                "PROVIDE_HINT": round(float(q[1]), 4),
                "SENSORY_BREAK": round(float(q[2]), 4),
            },
            "confidence": round(conf, 4),
        }


adaptive_engine = AdaptiveEngine()
