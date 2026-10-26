"""Advisory alert presentation and HUD visual overlay for DriveGuard."""

from typing import Optional
import cv2
import numpy as np

from driveguard.config import AppConfig
from driveguard.fusion import AdvisoryLevel, DriverStateSnapshot
from driveguard.headpose import project_pose_axes


class AlertOverlayRenderer:
    """Renders real-time HUD, telemetry, and advisory alerts onto video frames."""

    COLOR_BG_PANEL = (22, 22, 22)
    COLOR_BORDER = (50, 50, 50)
    COLOR_TEXT = (255, 255, 255)
    COLOR_MUTED = (160, 160, 160)

    COLOR_NORMAL = (46, 204, 113)     # Emerald Green
    COLOR_NOTICE = (241, 196, 15)     # Amber Yellow
    COLOR_WARNING = (231, 76, 60)     # Crimson Red
    COLOR_UNKNOWN = (127, 140, 141)   # Slate Gray
    COLOR_INDICATOR = (0, 255, 127)   # Bright Spring Green

    def __init__(self, config: AppConfig):
        self.config = config

    def render(
        self,
        frame: np.ndarray,
        state: DriverStateSnapshot,
        fps: float,
        rvec: Optional[np.ndarray] = None,
        tvec: Optional[np.ndarray] = None,
        camera_matrix: Optional[np.ndarray] = None,
        landmarks_pixel: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        output = frame.copy()
        h, w = output.shape[:2]

        if self.config.privacy.display_camera_indicator:
            self._draw_privacy_badge(output)

        if self.config.ui.show_landmarks and landmarks_pixel is not None and state.face_reliable:
            self._draw_landmarks(output, landmarks_pixel)

        if (
            self.config.ui.show_head_axis
            and rvec is not None
            and tvec is not None
            and camera_matrix is not None
            and state.face_reliable
        ):
            self._draw_pose_axes(output, rvec, tvec, camera_matrix)

        self._draw_advisory_banner(output, state, w)

        if self.config.ui.show_metrics:
            self._draw_telemetry_panel(output, state, fps, h, w)

        return output

    def _draw_privacy_badge(self, frame: np.ndarray) -> None:
        text = self.config.privacy.indicator_text
        badge_x, badge_y = 15, 15
        badge_w, badge_h = 360, 26

        cv2.rectangle(
            frame,
            (badge_x, badge_y),
            (badge_x + badge_w, badge_y + badge_h),
            (15, 15, 15),
            cv2.FILLED,
        )
        cv2.rectangle(
            frame,
            (badge_x, badge_y),
            (badge_x + badge_w, badge_y + badge_h),
            (40, 40, 40),
            1,
        )

        cv2.circle(frame, (badge_x + 14, badge_y + 13), 5, self.COLOR_INDICATOR, cv2.FILLED)
        cv2.circle(frame, (badge_x + 14, badge_y + 13), 7, self.COLOR_INDICATOR, 1)

        cv2.putText(
            frame,
            text,
            (badge_x + 28, badge_y + 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            self.COLOR_TEXT,
            1,
            cv2.LINE_AA,
        )

    def _draw_advisory_banner(
        self,
        frame: np.ndarray,
        state: DriverStateSnapshot,
        frame_width: int,
    ) -> None:
        banner_w = 460
        banner_h = 44
        banner_x = (frame_width - banner_w) // 2
        banner_y = 12

        if not state.face_reliable:
            color = self.COLOR_UNKNOWN
            header = "MONITORING PAUSED"
            msg = self.config.fusion.advisory_reasons.face_not_detected
        elif state.advisory_level == AdvisoryLevel.WARNING:
            color = self.COLOR_WARNING
            header = "ADVISORY ALERT"
            msg = f"{state.advisory_reason.upper()} ({state.display_message})"
        elif state.advisory_level == AdvisoryLevel.NOTICE:
            color = self.COLOR_NOTICE
            header = "ADVISORY NOTICE"
            msg = f"{state.advisory_reason} ({state.display_message})"
        else:
            color = self.COLOR_NORMAL
            header = "ADVISORY STATUS"
            msg = "Attentive - Nominal"

        cv2.rectangle(
            frame,
            (banner_x, banner_y),
            (banner_x + banner_w, banner_y + banner_h),
            (20, 20, 20),
            cv2.FILLED,
        )
        cv2.rectangle(
            frame,
            (banner_x, banner_y),
            (banner_x + banner_w, banner_y + banner_h),
            color,
            2,
        )
        cv2.rectangle(
            frame,
            (banner_x, banner_y),
            (banner_x + 8, banner_y + banner_h),
            color,
            cv2.FILLED,
        )

        cv2.putText(
            frame,
            header,
            (banner_x + 16, banner_y + 16),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            color,
            1,
            cv2.LINE_AA,
        )
        cv2.putText(
            frame,
            msg[:48],
            (banner_x + 16, banner_y + 34),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.50,
            self.COLOR_TEXT,
            1,
            cv2.LINE_AA,
        )

    def _draw_telemetry_panel(
        self,
        frame: np.ndarray,
        state: DriverStateSnapshot,
        fps: float,
        frame_h: int,
        frame_w: int,
    ) -> None:
        panel_w = 260
        panel_h = 165
        panel_x = 15
        panel_y = frame_h - panel_h - 15

        cv2.rectangle(
            frame,
            (panel_x, panel_y),
            (panel_x + panel_w, panel_y + panel_h),
            (20, 20, 20),
            cv2.FILLED,
        )
        cv2.rectangle(
            frame,
            (panel_x, panel_y),
            (panel_x + panel_w, panel_y + panel_h),
            (50, 50, 50),
            1,
        )

        cv2.putText(
            frame,
            f"TELEMETRY  [{fps:.1f} FPS]",
            (panel_x + 12, panel_y + 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            self.COLOR_MUTED,
            1,
            cv2.LINE_AA,
        )
        cv2.line(
            frame,
            (panel_x + 10, panel_y + 26),
            (panel_x + panel_w - 10, panel_y + 26),
            (45, 45, 45),
            1,
        )

        y_offset = panel_y + 46
        line_height = 22

        if not state.face_reliable:
            cv2.putText(
                frame,
                "Face tracking: Searching...",
                (panel_x + 12, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                self.COLOR_UNKNOWN,
                1,
                cv2.LINE_AA,
            )
            cv2.putText(
                frame,
                "Ensure face is visible",
                (panel_x + 12, y_offset + line_height),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.40,
                self.COLOR_MUTED,
                1,
                cv2.LINE_AA,
            )
            return

        ear_color = (
            self.COLOR_WARNING
            if state.avg_ear < self.config.eye.ear_threshold
            else self.COLOR_NORMAL
        )
        cv2.putText(
            frame,
            f"EAR: {state.avg_ear:.3f} (thr: {self.config.eye.ear_threshold})",
            (panel_x + 12, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            ear_color,
            1,
            cv2.LINE_AA,
        )

        y_offset += line_height
        closed_color = (
            self.COLOR_WARNING
            if state.eye_closed_sec >= self.config.eye.closure_duration_warning_sec
            else (
                self.COLOR_NOTICE
                if state.eye_closed_sec >= self.config.eye.closure_duration_notice_sec
                else self.COLOR_TEXT
            )
        )
        cv2.putText(
            frame,
            f"Eye Closure: {state.eye_closed_sec:.2f}s",
            (panel_x + 12, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            closed_color,
            1,
            cv2.LINE_AA,
        )

        y_offset += line_height
        perclos_text = (
            f"{state.perclos * 100.0:.1f}%" if state.perclos is not None else "Calibrating..."
        )
        cv2.putText(
            frame,
            f"PERCLOS: {perclos_text} (win: {int(self.config.eye.perclos_window_sec)}s)",
            (panel_x + 12, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            self.COLOR_TEXT,
            1,
            cv2.LINE_AA,
        )

        y_offset += line_height
        cv2.putText(
            frame,
            f"Yaw: {state.yaw_deg:+.1f}° | Pitch: {state.pitch_deg:+.1f}°",
            (panel_x + 12, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.40,
            self.COLOR_TEXT,
            1,
            cv2.LINE_AA,
        )

        y_offset += line_height
        dev_color = (
            self.COLOR_WARNING
            if state.head_deviated_sec >= self.config.headpose.sustained_deviation_warning_sec
            else (
                self.COLOR_NOTICE
                if state.head_deviated_sec >= self.config.headpose.sustained_deviation_notice_sec
                else self.COLOR_MUTED
            )
        )
        cv2.putText(
            frame,
            f"Deviation: {state.head_deviated_sec:.2f}s ({state.head_pose_reason})",
            (panel_x + 12, y_offset),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.38,
            dev_color,
            1,
            cv2.LINE_AA,
        )

    def _draw_landmarks(self, frame: np.ndarray, landmarks_pixel: np.ndarray) -> None:
        left_indices = self.config.eye.left_eye_indices
        right_indices = self.config.eye.right_eye_indices
        pose_indices = self.config.headpose.get_keypoint_indices_list()

        for idx in left_indices + right_indices:
            if idx < len(landmarks_pixel):
                pt = landmarks_pixel[idx][:2].astype(int)
                cv2.circle(frame, (pt[0], pt[1]), 2, (0, 220, 255), cv2.FILLED)

        for idx in pose_indices:
            if idx < len(landmarks_pixel):
                pt = landmarks_pixel[idx][:2].astype(int)
                cv2.circle(frame, (pt[0], pt[1]), 3, (255, 105, 180), cv2.FILLED)

    def _draw_pose_axes(
        self,
        frame: np.ndarray,
        rvec: np.ndarray,
        tvec: np.ndarray,
        camera_matrix: np.ndarray,
    ) -> None:
        try:
            origin, x_pt, y_pt, z_pt = project_pose_axes(
                rvec=rvec,
                tvec=tvec,
                camera_matrix=camera_matrix,
                axis_length=self.config.ui.axis_length,
            )
            cv2.line(frame, origin, x_pt, (0, 0, 255), 2, cv2.LINE_AA)
            cv2.line(frame, origin, y_pt, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.line(frame, origin, z_pt, (255, 0, 0), 2, cv2.LINE_AA)
        except Exception:
            pass
