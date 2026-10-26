"""Unit tests for eye closure metrics (EAR and PERCLOS)."""

import numpy as np
import pytest
from driveguard.config import EyeConfig
from driveguard.eye import (
    EyeStateTracker,
    calculate_ear,
    calculate_perclos_from_intervals,
    compute_both_eyes_ear,
)


def test_calculate_ear_open_eye():
    pts = np.array(
        [
            [0.0, 0.0],
            [10.0, 7.5],
            [30.0, 7.5],
            [40.0, 0.0],
            [30.0, -7.5],
            [10.0, -7.5],
        ],
        dtype=np.float64,
    )
    ear = calculate_ear(pts)
    assert pytest.approx(ear, rel=1e-3) == 0.375
    assert ear > 0.25


def test_calculate_ear_closed_eye():
    pts = np.array(
        [
            [0.0, 0.0],
            [10.0, 0.5],
            [30.0, 0.5],
            [40.0, 0.0],
            [30.0, -0.5],
            [10.0, -0.5],
        ],
        dtype=np.float64,
    )
    ear = calculate_ear(pts)
    assert pytest.approx(ear, rel=1e-3) == 0.025
    assert ear < 0.15


def test_calculate_ear_degenerate_zero_width():
    pts = np.zeros((6, 2), dtype=np.float64)
    ear = calculate_ear(pts)
    assert ear == 0.0


def test_compute_both_eyes_ear():
    landmarks = np.zeros((500, 3), dtype=np.float64)
    left_idx = [10, 11, 12, 13, 14, 15]
    right_idx = [20, 21, 22, 23, 24, 25]

    landmarks[left_idx] = [
        [0.0, 0.0, 0],
        [10.0, 7.5, 0],
        [30.0, 7.5, 0],
        [40.0, 0.0, 0],
        [30.0, -7.5, 0],
        [10.0, -7.5, 0],
    ]
    landmarks[right_idx] = [
        [0.0, 0.0, 0],
        [10.0, 0.5, 0],
        [30.0, 0.5, 0],
        [40.0, 0.0, 0],
        [30.0, -0.5, 0],
        [10.0, -0.5, 0],
    ]

    l_ear, r_ear, avg_ear = compute_both_eyes_ear(landmarks, left_idx, right_idx)
    assert pytest.approx(l_ear, rel=1e-2) == 0.375
    assert pytest.approx(r_ear, rel=1e-2) == 0.025
    assert pytest.approx(avg_ear, rel=1e-2) == 0.20


def test_perclos_calculation():
    history = []
    for t in range(0, 8):
        history.append((float(t), False))
    for t in range(8, 11):
        history.append((float(t), True))

    perclos = calculate_perclos_from_intervals(
        history=history,
        window_sec=60.0,
        current_time=10.0,
        min_history_sec=5.0,
    )
    assert perclos is not None
    assert pytest.approx(perclos, abs=0.01) == 0.20


def test_eye_state_tracker_closure_duration():
    cfg = EyeConfig(ear_threshold=0.21)
    tracker = EyeStateTracker(cfg)

    is_closed, closed_sec, _ = tracker.update(timestamp=100.0, avg_ear=0.35, is_face_reliable=True)
    assert not is_closed
    assert closed_sec == 0.0

    is_closed, closed_sec, _ = tracker.update(timestamp=101.0, avg_ear=0.10, is_face_reliable=True)
    assert is_closed

    is_closed, closed_sec, _ = tracker.update(timestamp=102.5, avg_ear=0.12, is_face_reliable=True)
    assert is_closed
    assert pytest.approx(closed_sec, abs=1e-2) == 1.5

    is_closed, closed_sec, _ = tracker.update(timestamp=103.0, avg_ear=0.32, is_face_reliable=True)
    assert not is_closed
    assert closed_sec == 0.0
