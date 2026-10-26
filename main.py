"""DriveGuard Main Entry Point.

Runs the DriveGuard Web Application by default.
Supports --cli flag for native OpenCV desktop window display.
"""

import argparse
import sys
import uvicorn
from driveguard.config import load_config


def parse_args():
    parser = argparse.ArgumentParser(description="DriveGuard Driver State Monitoring")
    parser.add_argument("--cli", action="store_true", help="Run as native OpenCV desktop window instead of Web Dashboard")
    parser.add_argument("--port", type=int, default=8000, help="Web server port (default: 8000)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Web server host (default: 127.0.0.1)")
    parser.add_argument("--camera", type=str, default=None, help="Webcam device ID or video file path")
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_config("config.yaml")

    if args.cli:
        from driveguard.capture import FrameCapture
        from driveguard.landmarks import FaceLandmarkDetector
        from driveguard.eye import EyeStateTracker, compute_both_eyes_ear
        from driveguard.headpose import HeadPoseTracker, build_camera_matrix, estimate_head_pose
        from driveguard.fusion import TemporalFusionEngine
        from driveguard.alerts import AlertOverlayRenderer
        import cv2, time

        if args.camera is not None:
            if args.camera.isdigit():
                config.camera.device_id = int(args.camera)
                config.camera.playback_file = None
            else:
                config.camera.playback_file = args.camera

        capture = FrameCapture(config.camera, config.privacy)
        detector = FaceLandmarkDetector(config.landmarks)
        eye_tracker = EyeStateTracker(config.eye)
        head_tracker = HeadPoseTracker(config.headpose)
        fusion_engine = TemporalFusionEngine(config.fusion, config.eye, config.headpose)
        renderer = AlertOverlayRenderer(config)
        camera_matrix = build_camera_matrix(config.camera.width, config.camera.height)
        model_points_3d = config.headpose.get_model_points_array()
        pose_indices = config.headpose.get_keypoint_indices_list()

        print("[INFO] Starting DriveGuard native OpenCV desktop window. Press 'q' to quit.")
        last_t = time.time()
        fps_smooth = 30.0

        try:
            while True:
                ret, frame, timestamp = capture.read()
                if not ret or frame is None:
                    break
                dt = max(1e-4, timestamp - last_t)
                last_t = timestamp
                fps_smooth = 0.9 * fps_smooth + 0.1 * (1.0 / dt)

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
                    _, _, avg_ear = compute_both_eyes_ear(lms_px, config.eye.left_eye_indices, config.eye.right_eye_indices)
                    is_closed, eye_closed_sec, perclos = eye_tracker.update(timestamp, avg_ear, True)
                    image_points = lms_px[pose_indices, :2]
                    pose_ok, yaw_deg, pitch_deg, roll_deg, rvec, tvec = estimate_head_pose(image_points, model_points_3d, camera_matrix)
                    if pose_ok:
                        _, head_deviated_sec, head_reason = head_tracker.update(timestamp, yaw_deg, pitch_deg, roll_deg, True)
                else:
                    eye_tracker.update(timestamp, 0.0, False)
                    head_tracker.update(timestamp, 0.0, 0.0, 0.0, False)

                snapshot = fusion_engine.evaluate(
                    timestamp, lm_result.is_reliable, avg_ear, perclos, eye_closed_sec,
                    yaw_deg, pitch_deg, roll_deg, head_deviated_sec, head_reason
                )

                annotated = renderer.render(frame, snapshot, fps_smooth, rvec, tvec, camera_matrix, lm_result.landmarks_pixel)
                cv2.imshow("DriveGuard Desktop", annotated)
                if cv2.waitKey(1) & 0xFF in (ord('q'), ord('Q'), 27):
                    break
        finally:
            capture.release()
            detector.close()
            cv2.destroyAllWindows()
        return

    # Default: Launch Web Dashboard
    host = args.host or config.server.host
    port = args.port or config.server.port
    print("\n=======================================================")
    print("   [DriveGuard] Real-Time Driver-State Cockpit")
    print(f"   Web Dashboard: http://{host}:{port}")
    print("   Privacy: Local processing only (no video saved)")
    print("=======================================================\n")
    uvicorn.run("web.app:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
