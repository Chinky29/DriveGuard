"""Unit tests for head pose estimation and deviation logic."""

import cv2
import numpy as np
import pytest
from driveguard.config import HeadPoseConfig
from driveguard.headpose import (
    HeadPoseTracker,
    build_camera_matrix,
    estimate_head_pose,
    is_head_deviated,
    project_pose_axes,
)


def test_build_camera_matrix():
    cam_mtx = build_camera_matrix(640, 480, focal_length=600.0)
    assert cam_mtx.shape == (3, 3)
    assert cam_mtx[0, 0] == 600.0
    assert cam_mtx[1, 1] == 600.0
    assert cam_mtx[0, 2] == 320.0
    assert cam_mtx[1, 2] == 240.0


def test_estimate_head_pose_frontal():
    cfg = HeadPoseConfig()
    model_pts = cfg.get_model_points_array()
    cam_mtx = build_camera_matrix(640, 480)

    rvec_true = np.zeros((3, 1), dtype=np.float64)
    tvec_true = np.array([[0.0], [0.0], [1000.0]], dtype=np.float64)

    img_pts, _ = cv2.projectPoints(model_pts, rvec_true, tvec_true, cam_mtx, None)
    img_pts = img_pts.reshape(-1, 2)

    ok, yaw, pitch, roll, _, _ = estimate_head_pose(img_pts, model_pts, cam_mtx)
    assert ok is True
    assert pytest.approx(yaw, abs=1.0) == 0.0
    assert pytest.approx(pitch, abs=1.0) == 0.0
    assert pytest.approx(roll, abs=1.0) == 0.0


def test_is_head_deviated_thresholds():
    cfg = HeadPoseConfig(yaw_threshold_deg=25.0)

    dev, reason = is_head_deviated(yaw=5.0, pitch=2.0, roll=-3.0, config=cfg)
    assert not dev
    assert "facing forward" in reason

    dev, reason = is_head_deviated(yaw=32.0, pitch=0.0, roll=0.0, config=cfg)
    assert dev
    assert "turned right" in reason


def test_head_pose_tracker_duration():
    cfg = HeadPoseConfig(yaw_threshold_deg=25.0)
    tracker = HeadPoseTracker(cfg)

    dev, dur, _ = tracker.update(timestamp=10.0, yaw=0.0, pitch=0.0, roll=0.0, is_face_reliable=True)
    assert not dev

    dev, dur, _ = tracker.update(timestamp=11.0, yaw=30.0, pitch=0.0, roll=0.0, is_face_reliable=True)
    assert dev

    dev, dur, _ = tracker.update(timestamp=13.0, yaw=32.0, pitch=0.0, roll=0.0, is_face_reliable=True)
    assert dev
    assert pytest.approx(dur, abs=1e-2) == 2.0


def test_project_pose_axes():
    cam_mtx = build_camera_matrix(640, 480)
    rvec = np.zeros((3, 1), dtype=np.float64)
    tvec = np.array([[0.0], [0.0], [800.0]], dtype=np.float64)

    origin, x_pt, y_pt, z_pt = project_pose_axes(rvec, tvec, cam_mtx, axis_length=50.0)
    assert len(origin) == 2 and len(x_pt) == 2
