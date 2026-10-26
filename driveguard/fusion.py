"""Temporal fusion engine for driver-state monitoring.

Fuses eye-closure (EAR/PERCLOS) and head-pose (yaw/pitch) over time.
Strict Rules:
- Never claim 'drowsy' or 'unsafe'. Alerts are strictly advisory with neutral causal reasons.
- If face is not reliably detected, output UNKNOWN and make no state decision.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional
from driveguard.config import EyeConfig, FusionConfig, HeadPoseConfig


class AdvisoryLevel(str, Enum):
    UNKNOWN = "UNKNOWN"       # Face not reliably detected; no decision
    NORMAL = "NORMAL"         # Attentive
    NOTICE = "NOTICE"         # Low-tier advisory
    WARNING = "WARNING"       # Elevated advisory


@dataclass
class DriverStateSnapshot:
    """Consolidated state snapshot at a single evaluation point."""
    timestamp: float
    face_reliable: bool
    advisory_level: AdvisoryLevel
    advisory_reason: str
    display_message: str
    avg_ear: float
    perclos: Optional[float]
    eye_closed_sec: float
    yaw_deg: float
    pitch_deg: float
    roll_deg: float
    head_deviated_sec: float
    head_pose_reason: str


class TemporalFusionEngine:
    """Fuses eye and head pose temporal streams into advisory driver state."""

    def __init__(
        self,
        fusion_cfg: FusionConfig,
        eye_cfg: EyeConfig,
        headpose_cfg: HeadPoseConfig,
    ):
        self.fusion_cfg = fusion_cfg
        self.eye_cfg = eye_cfg
        self.headpose_cfg = headpose_cfg

        self.last_warning_time: Optional[float] = None
        self.last_state: AdvisoryLevel = AdvisoryLevel.NORMAL

    def evaluate(
        self,
        timestamp: float,
        face_reliable: bool,
        avg_ear: float,
        perclos: Optional[float],
        eye_closed_sec: float,
        yaw_deg: float,
        pitch_deg: float,
        roll_deg: float,
        head_deviated_sec: float,
        head_pose_reason: str,
    ) -> DriverStateSnapshot:
        if not face_reliable:
            return DriverStateSnapshot(
                timestamp=timestamp,
                face_reliable=False,
                advisory_level=AdvisoryLevel.UNKNOWN,
                advisory_reason=self.fusion_cfg.advisory_reasons.face_not_detected,
                display_message="Face not reliably detected",
                avg_ear=avg_ear,
                perclos=perclos,
                eye_closed_sec=0.0,
                yaw_deg=yaw_deg,
                pitch_deg=pitch_deg,
                roll_deg=roll_deg,
                head_deviated_sec=0.0,
                head_pose_reason="No reliable face",
            )

        eye_warning = eye_closed_sec >= self.eye_cfg.closure_duration_warning_sec
        eye_notice = eye_closed_sec >= self.eye_cfg.closure_duration_notice_sec

        head_warning = head_deviated_sec >= self.headpose_cfg.sustained_deviation_warning_sec
        head_notice = head_deviated_sec >= self.headpose_cfg.sustained_deviation_notice_sec

        perclos_advisory = (
            perclos is not None and perclos >= self.eye_cfg.perclos_advisory_threshold
        )

        level = AdvisoryLevel.NORMAL
        reason = "Attentive"
        display_msg = "Advisory: Attentive"

        if eye_warning and head_warning:
            level = AdvisoryLevel.WARNING
            reason = self.fusion_cfg.advisory_reasons.combined
            display_msg = f"Advisory Alert: {reason}"
        elif eye_warning:
            level = AdvisoryLevel.WARNING
            reason = self.fusion_cfg.advisory_reasons.eye_closure
            display_msg = f"Advisory Alert: {reason} ({eye_closed_sec:.1f}s)"
        elif head_warning:
            level = AdvisoryLevel.WARNING
            reason = self.fusion_cfg.advisory_reasons.head_deviation
            display_msg = f"Advisory Alert: {reason} ({head_deviated_sec:.1f}s)"
        elif eye_notice and head_notice:
            level = AdvisoryLevel.NOTICE
            reason = self.fusion_cfg.advisory_reasons.combined
            display_msg = f"Advisory Notice: {reason}"
        elif eye_notice:
            level = AdvisoryLevel.NOTICE
            reason = self.fusion_cfg.advisory_reasons.eye_closure
            display_msg = f"Advisory Notice: {reason} ({eye_closed_sec:.1f}s)"
        elif head_notice:
            level = AdvisoryLevel.NOTICE
            reason = self.fusion_cfg.advisory_reasons.head_deviation
            display_msg = f"Advisory Notice: {reason} ({head_deviated_sec:.1f}s)"
        elif perclos_advisory:
            level = AdvisoryLevel.NOTICE
            reason = self.fusion_cfg.advisory_reasons.perclos
            display_msg = f"Advisory Notice: {reason} ({perclos * 100.0:.1f}%)"

        self.last_state = level
        if level == AdvisoryLevel.WARNING:
            self.last_warning_time = timestamp

        return DriverStateSnapshot(
            timestamp=timestamp,
            face_reliable=True,
            advisory_level=level,
            advisory_reason=reason,
            display_message=display_msg,
            avg_ear=avg_ear,
            perclos=perclos,
            eye_closed_sec=eye_closed_sec,
            yaw_deg=yaw_deg,
            pitch_deg=pitch_deg,
            roll_deg=roll_deg,
            head_deviated_sec=head_deviated_sec,
            head_pose_reason=head_pose_reason,
        )

    def reset(self) -> None:
        self.last_warning_time = None
        self.last_state = AdvisoryLevel.NORMAL
