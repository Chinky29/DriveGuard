"""MediaPipe Face Landmark detection wrapper for DriveGuard.

Detects 468+ facial landmarks using MediaPipe Tasks FaceLandmarker
(with fallback to legacy solutions.face_mesh if available).
Strictly validates detection reliability (Rule 2).
"""

import logging
import os
import urllib.request
from dataclasses import dataclass
from typing import Optional
import cv2
import mediapipe as mp
import numpy as np

from driveguard.config import LandmarksConfig

logger = logging.getLogger("driveguard.landmarks")


@dataclass
class FaceLandmarkResult:
    """Detection result for a single frame."""
    detected: bool
    is_reliable: bool
    num_landmarks: int
    landmarks_norm: Optional[np.ndarray] = None   # shape (N, 3), normalized [0, 1]
    landmarks_pixel: Optional[np.ndarray] = None  # shape (N, 3), pixel coords (x, y, z_scaled)


class FaceLandmarkDetector:
    """Extracts 3D facial landmarks from video frames."""

    def __init__(self, config: LandmarksConfig):
        self.config = config
        self._use_tasks_api = False
        self._detector = None
        self._setup_detector()

    def _setup_detector(self) -> None:
        if hasattr(mp, "solutions") and hasattr(mp.solutions, "face_mesh"):
            logger.info("Using MediaPipe solutions.face_mesh API")
            self._use_tasks_api = False
            self._detector = mp.solutions.face_mesh.FaceMesh(
                max_num_faces=self.config.max_num_faces,
                refine_landmarks=True,
                min_detection_confidence=self.config.min_face_detection_confidence,
                min_tracking_confidence=self.config.min_tracking_confidence,
            )
            return

        logger.info("Using MediaPipe Tasks vision.FaceLandmarker API")
        self._use_tasks_api = True
        self._ensure_model_exists()

        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        base_options = python.BaseOptions(model_asset_path=self.config.model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_faces=self.config.max_num_faces,
            min_face_detection_confidence=self.config.min_face_detection_confidence,
            min_face_presence_confidence=self.config.min_face_presence_confidence,
            min_tracking_confidence=self.config.min_tracking_confidence,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        self._detector = vision.FaceLandmarker.create_from_options(options)

    def _ensure_model_exists(self) -> None:
        model_path = self.config.model_path
        if os.path.exists(model_path) and os.path.getsize(model_path) > 1000:
            return

        if not self.config.auto_download_model:
            raise FileNotFoundError(
                f"Face landmarker model not found at '{model_path}' and auto_download_model is disabled."
            )

        logger.info("Downloading FaceLandmarker model from %s to %s", self.config.model_url, model_path)
        os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
        req = urllib.request.Request(
            self.config.model_url,
            headers={"User-Agent": "DriveGuard-Landmarks/1.0"}
        )
        with urllib.request.urlopen(req) as resp, open(model_path, "wb") as out_file:
            out_file.write(resp.read())
        logger.info("Model downloaded successfully (size: %d bytes)", os.path.getsize(model_path))

    def detect(self, frame_bgr: np.ndarray) -> FaceLandmarkResult:
        if frame_bgr is None or frame_bgr.size == 0:
            return FaceLandmarkResult(detected=False, is_reliable=False, num_landmarks=0)

        h, w = frame_bgr.shape[:2]
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

        if self._use_tasks_api:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            result = self._detector.detect(mp_image)
            if not result or not result.face_landmarks:
                return FaceLandmarkResult(detected=False, is_reliable=False, num_landmarks=0)

            raw_lms = result.face_landmarks[0]
        else:
            result = self._detector.process(frame_rgb)
            if not result or not result.multi_face_landmarks:
                return FaceLandmarkResult(detected=False, is_reliable=False, num_landmarks=0)

            raw_lms = result.multi_face_landmarks[0].landmark

        num_pts = len(raw_lms)
        norm_coords = np.zeros((num_pts, 3), dtype=np.float32)
        pixel_coords = np.zeros((num_pts, 3), dtype=np.float32)

        for i, lm in enumerate(raw_lms):
            norm_coords[i] = [lm.x, lm.y, lm.z]
            pixel_coords[i] = [lm.x * w, lm.y * h, lm.z * w]

        is_reliable = num_pts >= self.config.reliable_detection_min_landmarks

        return FaceLandmarkResult(
            detected=True,
            is_reliable=is_reliable,
            num_landmarks=num_pts,
            landmarks_norm=norm_coords,
            landmarks_pixel=pixel_coords,
        )

    def close(self) -> None:
        if self._detector is not None:
            try:
                self._detector.close()
            except Exception:
                pass
            self._detector = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
