"""Configuration schema and YAML loader for DriveGuard.

Ensures all thresholds, windows, and indices live in config.yaml.
Strictly zero magic numbers in code.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml
import numpy as np


@dataclass
class ServerConfig:
    host: str = "127.0.0.1"
    port: int = 8000
    reload: bool = False


@dataclass
class CameraConfig:
    device_id: int = 0
    width: int = 640
    height: int = 480
    fps: int = 30
    playback_file: Optional[str] = None
    fallback_to_demo: bool = True
    demo_file: str = "demo_driver.mp4"


@dataclass
class LandmarksConfig:
    model_path: str = "models/face_landmarker.task"
    min_face_detection_confidence: float = 0.5
    min_face_presence_confidence: float = 0.5
    min_tracking_confidence: float = 0.5
    max_num_faces: int = 1
    reliable_detection_min_landmarks: int = 468
    auto_download_model: bool = True
    model_url: str = (
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
        "face_landmarker/float16/1/face_landmarker.task"
    )


@dataclass
class EyeConfig:
    ear_threshold: float = 0.21
    perclos_window_sec: float = 60.0
    perclos_min_history_sec: float = 5.0
    perclos_advisory_threshold: float = 0.15
    closure_duration_notice_sec: float = 1.0
    closure_duration_warning_sec: float = 1.8
    left_eye_indices: List[int] = field(
        default_factory=lambda: [362, 385, 387, 263, 373, 380]
    )
    right_eye_indices: List[int] = field(
        default_factory=lambda: [33, 160, 158, 133, 153, 144]
    )


@dataclass
class HeadPoseConfig:
    yaw_threshold_deg: float = 25.0
    pitch_up_threshold_deg: float = 20.0
    pitch_down_threshold_deg: float = 25.0
    roll_threshold_deg: float = 30.0
    sustained_deviation_notice_sec: float = 1.5
    sustained_deviation_warning_sec: float = 2.5
    pose_keypoint_indices: Dict[str, int] = field(
        default_factory=lambda: {
            "nose_tip": 1,
            "chin": 199,
            "left_eye_corner": 263,
            "right_eye_corner": 33,
            "left_mouth_corner": 291,
            "right_mouth_corner": 61,
        }
    )
    model_points_3d: Dict[str, List[float]] = field(
        default_factory=lambda: {
            "nose_tip": [0.0, 0.0, 0.0],
            "chin": [0.0, -330.0, -65.0],
            "left_eye_corner": [225.0, 170.0, -135.0],
            "right_eye_corner": [-225.0, 170.0, -135.0],
            "left_mouth_corner": [150.0, -150.0, -125.0],
            "right_mouth_corner": [-150.0, -150.0, -125.0],
        }
    )

    def get_model_points_array(self) -> np.ndarray:
        keys = [
            "nose_tip",
            "chin",
            "left_eye_corner",
            "right_eye_corner",
            "left_mouth_corner",
            "right_mouth_corner",
        ]
        return np.array([self.model_points_3d[k] for k in keys], dtype=np.float32)

    def get_keypoint_indices_list(self) -> List[int]:
        keys = [
            "nose_tip",
            "chin",
            "left_eye_corner",
            "right_eye_corner",
            "left_mouth_corner",
            "right_mouth_corner",
        ]
        return [self.pose_keypoint_indices[k] for k in keys]


@dataclass
class AdvisoryReasons:
    eye_closure: str = "prolonged eye closure"
    head_deviation: str = "sustained head deviation"
    combined: str = "sustained head deviation and eye closure"
    perclos: str = "high eye closure proportion"
    face_not_detected: str = "Face not reliably detected"


@dataclass
class FusionConfig:
    cooldown_sec: float = 2.0
    advisory_reasons: AdvisoryReasons = field(default_factory=AdvisoryReasons)


@dataclass
class PrivacyConfig:
    save_raw_frames: bool = False
    display_camera_indicator: bool = True
    indicator_text: str = "CAMERA ACTIVE [LOCAL PROCESSING ONLY]"


@dataclass
class UIConfig:
    window_title: str = "DriveGuard - Driver State Monitoring (Advisory Prototype)"
    display_width: int = 960
    display_height: int = 540
    show_fps: bool = True
    show_landmarks: bool = True
    show_head_axis: bool = True
    show_metrics: bool = True
    axis_length: float = 50.0


@dataclass
class LoggingConfig:
    level: str = "INFO"
    log_to_file: bool = True
    log_file: str = "driveguard.log"
    log_events_csv: str = "driver_events.csv"


@dataclass
class AppConfig:
    server: ServerConfig = field(default_factory=ServerConfig)
    camera: CameraConfig = field(default_factory=CameraConfig)
    landmarks: LandmarksConfig = field(default_factory=LandmarksConfig)
    eye: EyeConfig = field(default_factory=EyeConfig)
    headpose: HeadPoseConfig = field(default_factory=HeadPoseConfig)
    fusion: FusionConfig = field(default_factory=FusionConfig)
    privacy: PrivacyConfig = field(default_factory=PrivacyConfig)
    ui: UIConfig = field(default_factory=UIConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)


def load_config(config_path: str = "config.yaml") -> AppConfig:
    """Load configuration from a YAML file, merging with default schema."""
    path = Path(config_path)
    if not path.is_file():
        return AppConfig()

    with open(path, "r", encoding="utf-8") as f:
        data: Dict[str, Any] = yaml.safe_load(f) or {}

    srv_dict = data.get("server", {})
    server = ServerConfig(
        host=str(srv_dict.get("host", "127.0.0.1")),
        port=int(srv_dict.get("port", 8000)),
        reload=bool(srv_dict.get("reload", False)),
    )

    cam_dict = data.get("camera", {})
    camera = CameraConfig(
        device_id=int(cam_dict.get("device_id", 0)),
        width=int(cam_dict.get("width", 640)),
        height=int(cam_dict.get("height", 480)),
        fps=int(cam_dict.get("fps", 30)),
        playback_file=cam_dict.get("playback_file", None),
        fallback_to_demo=bool(cam_dict.get("fallback_to_demo", True)),
        demo_file=str(cam_dict.get("demo_file", "demo_driver.mp4")),
    )

    lm_dict = data.get("landmarks", {})
    landmarks = LandmarksConfig(
        model_path=str(lm_dict.get("model_path", "models/face_landmarker.task")),
        min_face_detection_confidence=float(lm_dict.get("min_face_detection_confidence", 0.5)),
        min_face_presence_confidence=float(lm_dict.get("min_face_presence_confidence", 0.5)),
        min_tracking_confidence=float(lm_dict.get("min_tracking_confidence", 0.5)),
        max_num_faces=int(lm_dict.get("max_num_faces", 1)),
        reliable_detection_min_landmarks=int(lm_dict.get("reliable_detection_min_landmarks", 468)),
        auto_download_model=bool(lm_dict.get("auto_download_model", True)),
        model_url=str(
            lm_dict.get(
                "model_url",
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            )
        ),
    )

    eye_dict = data.get("eye", {})
    eye = EyeConfig(
        ear_threshold=float(eye_dict.get("ear_threshold", 0.21)),
        perclos_window_sec=float(eye_dict.get("perclos_window_sec", 60.0)),
        perclos_min_history_sec=float(eye_dict.get("perclos_min_history_sec", 5.0)),
        perclos_advisory_threshold=float(eye_dict.get("perclos_advisory_threshold", 0.15)),
        closure_duration_notice_sec=float(eye_dict.get("closure_duration_notice_sec", 1.0)),
        closure_duration_warning_sec=float(eye_dict.get("closure_duration_warning_sec", 1.8)),
        left_eye_indices=eye_dict.get("left_eye_indices", [362, 385, 387, 263, 373, 380]),
        right_eye_indices=eye_dict.get("right_eye_indices", [33, 160, 158, 133, 153, 144]),
    )

    hp_dict = data.get("headpose", {})
    headpose = HeadPoseConfig(
        yaw_threshold_deg=float(hp_dict.get("yaw_threshold_deg", 25.0)),
        pitch_up_threshold_deg=float(hp_dict.get("pitch_up_threshold_deg", 20.0)),
        pitch_down_threshold_deg=float(hp_dict.get("pitch_down_threshold_deg", 25.0)),
        roll_threshold_deg=float(hp_dict.get("roll_threshold_deg", 30.0)),
        sustained_deviation_notice_sec=float(hp_dict.get("sustained_deviation_notice_sec", 1.5)),
        sustained_deviation_warning_sec=float(hp_dict.get("sustained_deviation_warning_sec", 2.5)),
        pose_keypoint_indices=hp_dict.get(
            "pose_keypoint_indices",
            {
                "nose_tip": 1,
                "chin": 199,
                "left_eye_corner": 263,
                "right_eye_corner": 33,
                "left_mouth_corner": 291,
                "right_mouth_corner": 61,
            },
        ),
        model_points_3d=hp_dict.get(
            "model_points_3d",
            {
                "nose_tip": [0.0, 0.0, 0.0],
                "chin": [0.0, -330.0, -65.0],
                "left_eye_corner": [225.0, 170.0, -135.0],
                "right_eye_corner": [-225.0, 170.0, -135.0],
                "left_mouth_corner": [150.0, -150.0, -125.0],
                "right_mouth_corner": [-150.0, -150.0, -125.0],
            },
        ),
    )

    fus_dict = data.get("fusion", {})
    reasons_dict = fus_dict.get("advisory_reasons", {})
    fusion = FusionConfig(
        cooldown_sec=float(fus_dict.get("cooldown_sec", 2.0)),
        advisory_reasons=AdvisoryReasons(
            eye_closure=str(reasons_dict.get("eye_closure", "prolonged eye closure")),
            head_deviation=str(reasons_dict.get("head_deviation", "sustained head deviation")),
            combined=str(
                reasons_dict.get("combined", "sustained head deviation and eye closure")
            ),
            perclos=str(reasons_dict.get("perclos", "high eye closure proportion")),
            face_not_detected=str(
                reasons_dict.get("face_not_detected", "Face not reliably detected")
            ),
        ),
    )

    priv_dict = data.get("privacy", {})
    privacy = PrivacyConfig(
        save_raw_frames=bool(priv_dict.get("save_raw_frames", False)),
        display_camera_indicator=bool(priv_dict.get("display_camera_indicator", True)),
        indicator_text=str(
            priv_dict.get("indicator_text", "CAMERA ACTIVE [LOCAL PROCESSING ONLY]")
        ),
    )

    ui_dict = data.get("ui", {})
    ui = UIConfig(
        window_title=str(
            ui_dict.get(
                "window_title",
                "DriveGuard - Driver State Monitoring (Advisory Prototype)",
            )
        ),
        display_width=int(ui_dict.get("display_width", 960)),
        display_height=int(ui_dict.get("display_height", 540)),
        show_fps=bool(ui_dict.get("show_fps", True)),
        show_landmarks=bool(ui_dict.get("show_landmarks", True)),
        show_head_axis=bool(ui_dict.get("show_head_axis", True)),
        show_metrics=bool(ui_dict.get("show_metrics", True)),
        axis_length=float(ui_dict.get("axis_length", 50.0)),
    )

    log_dict = data.get("logging", {})
    logging_cfg = LoggingConfig(
        level=str(log_dict.get("level", "INFO")),
        log_to_file=bool(log_dict.get("log_to_file", True)),
        log_file=str(log_dict.get("log_file", "driveguard.log")),
        log_events_csv=str(log_dict.get("log_events_csv", "driver_events.csv")),
    )

    return AppConfig(
        server=server,
        camera=camera,
        landmarks=landmarks,
        eye=eye,
        headpose=headpose,
        fusion=fusion,
        privacy=privacy,
        ui=ui,
        logging=logging_cfg,
    )
