"""Eye metrics computation: Eye Aspect Ratio (EAR) and PERCLOS.

All mathematical computations are pure functions testable without a camera.
Follows the Soukupová & Čech (2016) formulation.
"""

from collections import deque
from typing import Deque, Optional, Sequence, Tuple
import numpy as np

from driveguard.config import EyeConfig


def calculate_ear(eye_points: np.ndarray) -> float:
    """Calculate the Eye Aspect Ratio (EAR) for a 6-point eye contour.

    Formula:
        EAR = (||p2 - p6|| + ||p3 - p5||) / (2.0 * ||p1 - p4||)
    """
    if eye_points is None or len(eye_points) < 6:
        return 0.0

    pts = np.asarray(eye_points, dtype=np.float64)[:, :2]
    p1, p2, p3, p4, p5, p6 = pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]

    v1 = np.linalg.norm(p2 - p6)
    v2 = np.linalg.norm(p3 - p5)
    horizontal = np.linalg.norm(p1 - p4)

    if horizontal < 1e-6:
        return 0.0

    ear = float((v1 + v2) / (2.0 * horizontal))
    return max(0.0, ear)


def compute_both_eyes_ear(
    landmarks: np.ndarray,
    left_indices: Sequence[int],
    right_indices: Sequence[int],
) -> Tuple[float, float, float]:
    """Compute left, right, and average EAR given full facial landmarks."""
    if landmarks is None or len(landmarks) == 0:
        return 0.0, 0.0, 0.0

    left_pts = landmarks[left_indices]
    right_pts = landmarks[right_indices]

    left_ear = calculate_ear(left_pts)
    right_ear = calculate_ear(right_pts)
    avg_ear = (left_ear + right_ear) / 2.0

    return left_ear, right_ear, avg_ear


def calculate_perclos_from_intervals(
    history: Sequence[Tuple[float, bool]],
    window_sec: float,
    current_time: float,
    min_history_sec: float,
) -> Optional[float]:
    """Pure function calculating PERCLOS (% eye closure) over a time window."""
    if not history:
        return None

    cutoff_time = current_time - window_sec
    window_samples = [h for h in history if h[0] >= cutoff_time]

    if not window_samples:
        return None

    time_span = window_samples[-1][0] - window_samples[0][0]
    if time_span < min_history_sec:
        return None

    closed_time = 0.0
    total_time = 0.0

    for i in range(len(window_samples) - 1):
        t_curr, is_closed = window_samples[i]
        t_next, _ = window_samples[i + 1]
        dt = max(0.0, t_next - t_curr)
        total_time += dt
        if is_closed:
            closed_time += dt

    if total_time < 1e-4:
        return float(np.mean([s[1] for s in window_samples]))

    return float(np.clip(closed_time / total_time, 0.0, 1.0))


class EyeStateTracker:
    """Tracks eye closure state and maintains history for PERCLOS and closure duration."""

    def __init__(self, config: EyeConfig):
        self.config = config
        self.history: Deque[Tuple[float, bool]] = deque()
        self.closure_start_time: Optional[float] = None
        self.current_closed_duration: float = 0.0

    def update(
        self,
        timestamp: float,
        avg_ear: float,
        is_face_reliable: bool,
    ) -> Tuple[bool, float, Optional[float]]:
        if not is_face_reliable:
            self.closure_start_time = None
            self.current_closed_duration = 0.0
            return False, 0.0, self.get_perclos(timestamp)

        is_closed = avg_ear < self.config.ear_threshold

        if is_closed:
            if self.closure_start_time is None:
                self.closure_start_time = timestamp
            self.current_closed_duration = max(0.0, timestamp - self.closure_start_time)
        else:
            self.closure_start_time = None
            self.current_closed_duration = 0.0

        self.history.append((timestamp, is_closed))

        max_age = timestamp - (self.config.perclos_window_sec + 5.0)
        while self.history and self.history[0][0] < max_age:
            self.history.popleft()

        perclos = self.get_perclos(timestamp)
        return is_closed, self.current_closed_duration, perclos

    def get_perclos(self, current_time: float) -> Optional[float]:
        return calculate_perclos_from_intervals(
            self.history,
            window_sec=self.config.perclos_window_sec,
            current_time=current_time,
            min_history_sec=self.config.perclos_min_history_sec,
        )

    def reset(self) -> None:
        self.history.clear()
        self.closure_start_time = None
        self.current_closed_duration = 0.0
