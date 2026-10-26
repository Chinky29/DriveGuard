"""Head pose estimation using Perspective-n-Point (solvePnP) and Euler angles.

All mathematical computations are pure functions testable without a camera.
Estimates Yaw (turn), Pitch (nod), and Roll (tilt) in degrees.
"""

from typing import Optional, Tuple
import cv2
import numpy as np

from driveguard.config import HeadPoseConfig


def build_camera_matrix(
    image_width: int,
    image_height: int,
    focal_length: Optional[float] = None,
) -> np.ndarray:
    """Construct an idealized pinhole camera intrinsic matrix."""
    f = float(focal_length if focal_length is not None else image_width)
    cx = float(image_width / 2.0)
    cy = float(image_height / 2.0)
    return np.array(
        [
            [f, 0.0, cx],
            [0.0, f, cy],
            [0.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    )


def estimate_head_pose(
    image_points: np.ndarray,
    model_points: np.ndarray,
    camera_matrix: np.ndarray,
    dist_coeffs: Optional[np.ndarray] = None,
) -> Tuple[bool, float, float, float, Optional[np.ndarray], Optional[np.ndarray]]:
    """Estimate head pose Euler angles (yaw, pitch, roll in degrees) via solvePnP."""
    if image_points is None or len(image_points) < 6:
        return False, 0.0, 0.0, 0.0, None, None

    if dist_coeffs is None:
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

    img_pts = np.asarray(image_points, dtype=np.float64)[:, :2]
    mdl_pts = np.asarray(model_points, dtype=np.float64)

    success, rvec, tvec = cv2.solvePnP(
        mdl_pts,
        img_pts,
        camera_matrix,
        dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )

    if not success:
        return False, 0.0, 0.0, 0.0, None, None

    rmat, _ = cv2.Rodrigues(rvec)
    angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)

    pitch = float(angles[0])
    yaw = float(angles[1])
    roll = float(angles[2])

    return True, yaw, pitch, roll, rvec, tvec


def is_head_deviated(
    yaw: float,
    pitch: float,
    roll: float,
    config: HeadPoseConfig,
) -> Tuple[bool, str]:
    """Check if head orientation exceeds configured thresholds."""
    reasons = []

    if abs(yaw) > config.yaw_threshold_deg:
        direction = "right" if yaw > 0 else "left"
        reasons.append(f"turned {direction} ({abs(yaw):.1f}°)")

    if pitch > config.pitch_down_threshold_deg:
        reasons.append(f"looking down ({pitch:.1f}°)")
    elif pitch < -config.pitch_up_threshold_deg:
        reasons.append(f"looking up ({abs(pitch):.1f}°)")

    if abs(roll) > config.roll_threshold_deg:
        reasons.append(f"head tilted ({abs(roll):.1f}°)")

    if reasons:
        return True, ", ".join(reasons)
    return False, "facing forward"


def project_pose_axes(
    rvec: np.ndarray,
    tvec: np.ndarray,
    camera_matrix: np.ndarray,
    axis_length: float = 50.0,
    dist_coeffs: Optional[np.ndarray] = None,
) -> Tuple[Tuple[int, int], Tuple[int, int], Tuple[int, int], Tuple[int, int]]:
    """Project 3D coordinate axes (X, Y, Z) starting at nose tip onto 2D image coordinates."""
    if dist_coeffs is None:
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

    axis_3d = np.array(
        [
            [0.0, 0.0, 0.0],          # Origin (nose tip)
            [axis_length, 0.0, 0.0],  # X axis: Right (Red)
            [0.0, axis_length, 0.0],  # Y axis: Up (Green)
            [0.0, 0.0, axis_length],  # Z axis: Out (Blue)
        ],
        dtype=np.float64,
    )

    pts_2d, _ = cv2.projectPoints(axis_3d, rvec, tvec, camera_matrix, dist_coeffs)
    pts = pts_2d.reshape(-1, 2).astype(int)

    return (
        (int(pts[0][0]), int(pts[0][1])),
        (int(pts[1][0]), int(pts[1][1])),
        (int(pts[2][0]), int(pts[2][1])),
        (int(pts[3][0]), int(pts[3][1])),
    )


class HeadPoseTracker:
    """Tracks continuous head deviation duration over time."""

    def __init__(self, config: HeadPoseConfig):
        self.config = config
        self.deviation_start_time: Optional[float] = None
        self.current_deviated_duration: float = 0.0

    def update(
        self,
        timestamp: float,
        yaw: float,
        pitch: float,
        roll: float,
        is_face_reliable: bool,
    ) -> Tuple[bool, float, str]:
        if not is_face_reliable:
            self.deviation_start_time = None
            self.current_deviated_duration = 0.0
            return False, 0.0, "Face not reliably detected"

        deviated, reason = is_head_deviated(yaw, pitch, roll, self.config)

        if deviated:
            if self.deviation_start_time is None:
                self.deviation_start_time = timestamp
            self.current_deviated_duration = max(0.0, timestamp - self.deviation_start_time)
        else:
            self.deviation_start_time = None
            self.current_deviated_duration = 0.0

        return deviated, self.current_deviated_duration, reason

    def reset(self) -> None:
        self.deviation_start_time = None
        self.current_deviated_duration = 0.0
