"""Unit tests for Temporal Fusion and Advisory Alert Engine."""

import pytest
from driveguard.config import EyeConfig, FusionConfig, HeadPoseConfig
from driveguard.fusion import AdvisoryLevel, TemporalFusionEngine


@pytest.fixture
def fusion_engine():
    f_cfg = FusionConfig()
    e_cfg = EyeConfig(
        closure_duration_notice_sec=1.0,
        closure_duration_warning_sec=1.8,
        perclos_advisory_threshold=0.15,
    )
    h_cfg = HeadPoseConfig(
        sustained_deviation_notice_sec=1.5,
        sustained_deviation_warning_sec=2.5,
    )
    return TemporalFusionEngine(f_cfg, e_cfg, h_cfg)


def test_face_not_reliably_detected(fusion_engine):
    snapshot = fusion_engine.evaluate(
        timestamp=100.0,
        face_reliable=False,
        avg_ear=0.0,
        perclos=None,
        eye_closed_sec=0.0,
        yaw_deg=0.0,
        pitch_deg=0.0,
        roll_deg=0.0,
        head_deviated_sec=0.0,
        head_pose_reason="No face",
    )
    assert snapshot.advisory_level == AdvisoryLevel.UNKNOWN
    assert snapshot.advisory_reason == "Face not reliably detected"


def test_nominal_attentive_state(fusion_engine):
    snapshot = fusion_engine.evaluate(
        timestamp=100.0,
        face_reliable=True,
        avg_ear=0.32,
        perclos=0.02,
        eye_closed_sec=0.0,
        yaw_deg=2.0,
        pitch_deg=-1.0,
        roll_deg=0.5,
        head_deviated_sec=0.0,
        head_pose_reason="facing forward",
    )
    assert snapshot.advisory_level == AdvisoryLevel.NORMAL
    assert snapshot.advisory_reason == "Attentive"


def test_prolonged_eye_closure_advisories(fusion_engine):
    s2 = fusion_engine.evaluate(
        timestamp=101.2,
        face_reliable=True,
        avg_ear=0.10,
        perclos=0.05,
        eye_closed_sec=1.2,
        yaw_deg=0.0,
        pitch_deg=0.0,
        roll_deg=0.0,
        head_deviated_sec=0.0,
        head_pose_reason="facing forward",
    )
    assert s2.advisory_level == AdvisoryLevel.NOTICE
    assert s2.advisory_reason == "prolonged eye closure"

    s3 = fusion_engine.evaluate(
        timestamp=102.0,
        face_reliable=True,
        avg_ear=0.08,
        perclos=0.10,
        eye_closed_sec=2.0,
        yaw_deg=0.0,
        pitch_deg=0.0,
        roll_deg=0.0,
        head_deviated_sec=0.0,
        head_pose_reason="facing forward",
    )
    assert s3.advisory_level == AdvisoryLevel.WARNING
    assert s3.advisory_reason == "prolonged eye closure"


def test_strict_advisory_language_rule_1(fusion_engine):
    forbidden = ["drowsy", "unsafe", "danger", "asleep", "sleepy"]
    snapshot = fusion_engine.evaluate(
        timestamp=200.0,
        face_reliable=True,
        avg_ear=0.05,
        perclos=0.45,
        eye_closed_sec=3.5,
        yaw_deg=45.0,
        pitch_deg=30.0,
        roll_deg=0.0,
        head_deviated_sec=4.0,
        head_pose_reason="turned right",
    )
    for word in forbidden:
        assert word not in snapshot.advisory_reason.lower()
        assert word not in snapshot.display_message.lower()
