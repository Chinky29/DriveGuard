"""Video and camera capture module for DriveGuard.

Provides a unified interface for webcams, video file sources, and automatic demo fallback.
Privacy Guarantee: Never persists raw video frames to disk by default.
"""

import os
import time
from typing import Optional, Tuple
import cv2
import numpy as np

from driveguard.config import CameraConfig, PrivacyConfig


class FrameCapture:
    """Manages video capture from a physical webcam, video file, or demo fallback."""

    def __init__(self, camera_cfg: CameraConfig, privacy_cfg: PrivacyConfig):
        self.camera_cfg = camera_cfg
        self.privacy_cfg = privacy_cfg
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_video_file: bool = False
        self._initialize_source()

    def _initialize_source(self) -> None:
        source = self.camera_cfg.playback_file if self.camera_cfg.playback_file else self.camera_cfg.device_id
        if self.camera_cfg.playback_file:
            self.is_video_file = True
            self.cap = cv2.VideoCapture(self.camera_cfg.playback_file)
        else:
            self.is_video_file = False
            self.cap = cv2.VideoCapture(self.camera_cfg.device_id, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                self.cap = cv2.VideoCapture(self.camera_cfg.device_id)

            # If physical camera is absent, check for automated demo fallback
            if not self.cap.isOpened() and getattr(self.camera_cfg, "fallback_to_demo", False):
                demo_file = getattr(self.camera_cfg, "demo_file", "demo_driver.mp4")
                if os.path.exists(demo_file):
                    print(f"\n[INFO] No physical webcam detected at index {self.camera_cfg.device_id}.")
                    print(f"[INFO] Automatically falling back to demo feed '{demo_file}' for live evaluation.\n")
                    self.is_video_file = True
                    self.cap = cv2.VideoCapture(demo_file)

            if self.cap.isOpened() and not self.is_video_file:
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.camera_cfg.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.camera_cfg.height)
                self.cap.set(cv2.CAP_PROP_FPS, self.camera_cfg.fps)

    def is_opened(self) -> bool:
        return self.cap is not None and self.cap.isOpened()

    def read(self) -> Tuple[bool, Optional[np.ndarray], float]:
        timestamp = time.time()
        if not self.is_opened():
            return False, None, timestamp

        ret, frame = self.cap.read()

        # Handle video file looping for offline evaluation
        if not ret and self.is_video_file:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()

        if not ret or frame is None:
            return False, None, timestamp

        return True, frame, timestamp

    def release(self) -> None:
        if self.cap is not None:
            self.cap.release()
            self.cap = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
