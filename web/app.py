"""DriveGuard Web Application: Real-Time Driver-State Monitoring.

FastAPI backend providing:
- Web dashboard with Glassmorphism HUD
- Real-time client-side webcam frame processing via REST/WebSocket
- MJPEG streaming for server-side demo video / camera feed
- Telemetry state streaming, CSV audit export, and live threshold tuning.
"""

import base64
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from driveguard.alerts import AlertOverlayRenderer
from driveguard.capture import FrameCapture
from driveguard.config import AppConfig, load_config
from driveguard.eye import EyeStateTracker, compute_both_eyes_ear
from driveguard.fusion import AdvisoryLevel, TemporalFusionEngine
from driveguard.headpose import (
    HeadPoseTracker,
    build_camera_matrix,
    estimate_head_pose,
    project_pose_axes,
)
from driveguard.landmarks import FaceLandmarkDetector
from driveguard.logging_utils import EventLogger, setup_logger

# Initialize configuration and core services
CONFIG_PATH = os.environ.get("DRIVEGUARD_CONFIG", "config.yaml")
config: AppConfig = load_config(CONFIG_PATH)
logger = setup_logger(config.logging)
event_logger = EventLogger(config.logging.log_events_csv)

# Shared analysis pipeline
detector = FaceLandmarkDetector(config.landmarks)
eye_tracker = EyeStateTracker(config.eye)
head_tracker = HeadPoseTracker(config.headpose)
fusion_engine = TemporalFusionEngine(config.fusion, config.eye, config.headpose)
overlay_renderer = AlertOverlayRenderer(config)

camera_matrix = build_camera_matrix(config.camera.width, config.camera.height)
model_points_3d = config.headpose.get_model_points_array()
pose_indices = config.headpose.get_keypoint_indices_list()

app = FastAPI(
    title="DriveGuard",
    description="Real-Time Driver-State Monitoring Web Application",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Runtime state tracker
runtime_stats = {
    "start_time": time.time(),
    "frames_processed": 0,
    "current_fps": 30.0,
    "last_level": AdvisoryLevel.NORMAL.value,
}


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>DriveGuard Web Interface loading...</h1>")


@app.get("/api/config")
async def get_config():
    """Return active threshold and window configuration."""
    return {
        "camera": {
            "device_id": config.camera.device_id,
            "width": config.camera.width,
            "height": config.camera.height,
            "fps": config.camera.fps,
            "demo_file": config.camera.demo_file,
        },
        "eye": {
            "ear_threshold": config.eye.ear_threshold,
            "closure_duration_notice_sec": config.eye.closure_duration_notice_sec,
            "closure_duration_warning_sec": config.eye.closure_duration_warning_sec,
            "perclos_window_sec": config.eye.perclos_window_sec,
            "perclos_advisory_threshold": config.eye.perclos_advisory_threshold,
        },
        "headpose": {
            "yaw_threshold_deg": config.headpose.yaw_threshold_deg,
            "pitch_down_threshold_deg": config.headpose.pitch_down_threshold_deg,
            "pitch_up_threshold_deg": config.headpose.pitch_up_threshold_deg,
            "sustained_deviation_notice_sec": config.headpose.sustained_deviation_notice_sec,
            "sustained_deviation_warning_sec": config.headpose.sustained_deviation_warning_sec,
        },
        "privacy": {
            "indicator_text": config.privacy.indicator_text,
            "save_raw_frames": config.privacy.save_raw_frames,
        },
    }


@app.post("/api/config")
async def update_config(payload: Dict[str, Any]):
    """Live-update threshold parameters in memory."""
    if "ear_threshold" in payload:
        config.eye.ear_threshold = float(payload["ear_threshold"])
    if "closure_duration_warning_sec" in payload:
        config.eye.closure_duration_warning_sec = float(payload["closure_duration_warning_sec"])
    if "yaw_threshold_deg" in payload:
        config.headpose.yaw_threshold_deg = float(payload["yaw_threshold_deg"])
    if "sustained_deviation_warning_sec" in payload:
        config.headpose.sustained_deviation_warning_sec = float(payload["sustained_deviation_warning_sec"])
    return {"status": "updated", "config": await get_config()}


@app.get("/api/events")
async def get_recent_events():
    """Return recent telemetry audit rows from CSV."""
    csv_file = config.logging.log_events_csv
    if not os.path.exists(csv_file):
        return {"events": []}

    rows = []
    try:
        import csv
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        return {"events": rows[-50:]}
    except Exception as e:
        return {"error": str(e), "events": []}


@app.get("/api/export-events")
async def export_events():
    """Download the full CSV event log."""
    csv_file = config.logging.log_events_csv
    if os.path.exists(csv_file):
        return FileResponse(
            csv_file,
            media_type="text/csv",
            filename="driver_events.csv",
        )
    return {"error": "Event log is empty."}


def process_bgr_frame(frame: np.ndarray, timestamp: float) -> Dict[str, Any]:
    """Execute DriveGuard feature extraction and temporal fusion pipeline on a frame."""
    runtime_stats["frames_processed"] += 1
    h, w = frame.shape[:2]

    # 1. Face landmark detection
    lm_result = detector.detect(frame)

    avg_ear = 0.0
    left_ear, right_ear = 0.0, 0.0
    is_closed = False
    eye_closed_sec = 0.0
    perclos = None

    yaw_deg, pitch_deg, roll_deg = 0.0, 0.0, 0.0
    head_deviated_sec = 0.0
    head_reason = "No reliable face"
    axes_2d = None
    eye_landmarks_2d = []

    if lm_result.is_reliable and lm_result.landmarks_pixel is not None:
        lms_px = lm_result.landmarks_pixel

        # Eye closure
        left_ear, right_ear, avg_ear = compute_both_eyes_ear(
            lms_px,
            config.eye.left_eye_indices,
            config.eye.right_eye_indices,
        )
        is_closed, eye_closed_sec, perclos = eye_tracker.update(
            timestamp=timestamp,
            avg_ear=avg_ear,
            is_face_reliable=True,
        )

        # Eye contours for client rendering
        for idx in config.eye.left_eye_indices + config.eye.right_eye_indices:
            pt = lms_px[idx][:2]
            eye_landmarks_2d.append([float(pt[0]), float(pt[1])])

        # Head pose
        image_points = lms_px[pose_indices, :2]
        pose_ok, yaw_deg, pitch_deg, roll_deg, rvec, tvec = estimate_head_pose(
            image_points=image_points,
            model_points=model_points_3d,
            camera_matrix=camera_matrix,
        )

        if pose_ok:
            _, head_deviated_sec, head_reason = head_tracker.update(
                timestamp=timestamp,
                yaw=yaw_deg,
                pitch=pitch_deg,
                roll=roll_deg,
                is_face_reliable=True,
            )
            # Project 3D axes
            try:
                origin, x_pt, y_pt, z_pt = project_pose_axes(
                    rvec=rvec,
                    tvec=tvec,
                    camera_matrix=camera_matrix,
                    axis_length=config.ui.axis_length,
                )
                axes_2d = {
                    "origin": list(origin),
                    "x_pt": list(x_pt),
                    "y_pt": list(y_pt),
                    "z_pt": list(z_pt),
                }
            except Exception:
                pass
        else:
            head_reason = "Pose calculation failed"
    else:
        eye_tracker.update(timestamp, 0.0, is_face_reliable=False)
        head_tracker.update(timestamp, 0.0, 0.0, 0.0, is_face_reliable=False)

    # 2. Temporal Fusion
    snapshot = fusion_engine.evaluate(
        timestamp=timestamp,
        face_reliable=lm_result.is_reliable,
        avg_ear=avg_ear,
        perclos=perclos,
        eye_closed_sec=eye_closed_sec,
        yaw_deg=yaw_deg,
        pitch_deg=pitch_deg,
        roll_deg=roll_deg,
        head_deviated_sec=head_deviated_sec,
        head_pose_reason=head_reason,
    )

    # Log state transitions
    if snapshot.advisory_level.value != runtime_stats["last_level"]:
        event_logger.log_event(
            frame_id=runtime_stats["frames_processed"],
            timestamp_epoch=timestamp,
            advisory_level=snapshot.advisory_level.value,
            advisory_reason=snapshot.advisory_reason,
            face_detected=snapshot.face_reliable,
            avg_ear=snapshot.avg_ear,
            perclos=snapshot.perclos,
            eye_closed_sec=snapshot.eye_closed_sec,
            yaw_deg=snapshot.yaw_deg,
            pitch_deg=snapshot.pitch_deg,
            roll_deg=snapshot.roll_deg,
            head_deviated_sec=snapshot.head_deviated_sec,
            fps=runtime_stats["current_fps"],
        )
        runtime_stats["last_level"] = snapshot.advisory_level.value

    return {
        "timestamp": timestamp,
        "face_detected": snapshot.face_reliable,
        "advisory_level": snapshot.advisory_level.value,
        "advisory_reason": snapshot.advisory_reason,
        "display_message": snapshot.display_message,
        "avg_ear": round(avg_ear, 3),
        "left_ear": round(left_ear, 3),
        "right_ear": round(right_ear, 3),
        "perclos": round(perclos, 4) if perclos is not None else None,
        "eye_closed": is_closed,
        "eye_closed_sec": round(eye_closed_sec, 2),
        "yaw_deg": round(yaw_deg, 1),
        "pitch_deg": round(pitch_deg, 1),
        "roll_deg": round(roll_deg, 1),
        "head_deviated_sec": round(head_deviated_sec, 2),
        "head_reason": head_reason,
        "axes": axes_2d,
        "eye_landmarks": eye_landmarks_2d,
    }


@app.post("/api/process-frame")
async def process_frame_api(request: Request):
    """Receive a base64 encoded client frame, process it, and return telemetry."""
    data = await request.json()
    image_b64 = data.get("image", "")
    if not image_b64:
        return {"error": "Missing image"}

    # Strip header if present
    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]

    try:
        img_bytes = base64.b64decode(image_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Failed to decode frame"}

        telemetry = process_bgr_frame(frame, time.time())
        return telemetry
    except Exception as e:
        return {"error": str(e)}


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """Bidirectional WebSocket streaming for high-fps telemetry."""
    await websocket.accept()
    last_time = time.time()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            image_b64 = msg.get("image", "")
            if not image_b64:
                continue

            if "," in image_b64:
                image_b64 = image_b64.split(",")[1]

            img_bytes = base64.b64decode(image_b64)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            now = time.time()
            dt = max(1e-4, now - last_time)
            last_time = now
            fps = 1.0 / dt
            runtime_stats["current_fps"] = 0.9 * runtime_stats["current_fps"] + 0.1 * fps

            if frame is not None:
                telemetry = process_bgr_frame(frame, now)
                telemetry["fps"] = round(runtime_stats["current_fps"], 1)
                await websocket.send_text(json.dumps(telemetry))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WebSocket error: %s", e)


def generate_mjpeg_stream():
    """Generator for server-side demo video / camera stream."""
    capture = FrameCapture(config.camera, config.privacy)
    last_t = time.time()
    fps_smooth = float(config.camera.fps)

    try:
        while True:
            ret, frame, timestamp = capture.read()
            if not ret or frame is None:
                time.sleep(0.03)
                continue

            dt = max(1e-4, timestamp - last_t)
            last_t = timestamp
            fps_smooth = 0.9 * fps_smooth + 0.1 * (1.0 / dt)

            # Detect & overlay
            lm_result = detector.detect(frame)
            avg_ear = 0.0
            is_closed = False
            eye_closed_sec = 0.0
            perclos = None
            yaw_deg, pitch_deg, roll_deg = 0.0, 0.0, 0.0
            head_deviated_sec = 0.0
            head_reason = "No reliable face"
            rvec, tvec = None, None

            if lm_result.is_reliable and lm_result.landmarks_pixel is not None:
                lms_px = lm_result.landmarks_pixel
                _, _, avg_ear = compute_both_eyes_ear(
                    lms_px, config.eye.left_eye_indices, config.eye.right_eye_indices
                )
                is_closed, eye_closed_sec, perclos = eye_tracker.update(
                    timestamp, avg_ear, True
                )
                image_points = lms_px[pose_indices, :2]
                pose_ok, yaw_deg, pitch_deg, roll_deg, rvec, tvec = estimate_head_pose(
                    image_points, model_points_3d, camera_matrix
                )
                if pose_ok:
                    _, head_deviated_sec, head_reason = head_tracker.update(
                        timestamp, yaw_deg, pitch_deg, roll_deg, True
                    )
            else:
                eye_tracker.update(timestamp, 0.0, False)
                head_tracker.update(timestamp, 0.0, 0.0, 0.0, False)

            snapshot = fusion_engine.evaluate(
                timestamp=timestamp,
                face_reliable=lm_result.is_reliable,
                avg_ear=avg_ear,
                perclos=perclos,
                eye_closed_sec=eye_closed_sec,
                yaw_deg=yaw_deg,
                pitch_deg=pitch_deg,
                roll_deg=roll_deg,
                head_deviated_sec=head_deviated_sec,
                head_pose_reason=head_reason,
            )

            annotated = overlay_renderer.render(
                frame=frame,
                state=snapshot,
                fps=fps_smooth,
                rvec=rvec,
                tvec=tvec,
                camera_matrix=camera_matrix,
                landmarks_pixel=lm_result.landmarks_pixel,
            )

            _, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_bytes = jpeg.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            time.sleep(0.015)
    finally:
        capture.release()


@app.get("/video_feed")
async def video_feed():
    """Stream MJPEG video of the server-side camera or demo feed."""
    return StreamingResponse(
        generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
