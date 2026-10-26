"""Unit tests for DriveGuard configuration loader."""

from driveguard.config import AppConfig, load_config


def test_default_config():
    cfg = AppConfig()
    assert cfg.camera.width == 640
    assert cfg.camera.height == 480
    assert cfg.eye.ear_threshold == 0.21
    assert cfg.headpose.yaw_threshold_deg == 25.0
    assert cfg.privacy.save_raw_frames is False
    assert cfg.server.port == 8000
    assert "drowsy" not in cfg.fusion.advisory_reasons.eye_closure.lower()
    assert "unsafe" not in cfg.fusion.advisory_reasons.head_deviation.lower()


def test_load_config_from_yaml(tmp_path):
    yaml_content = """
server:
  host: "0.0.0.0"
  port: 8080
camera:
  device_id: 1
  width: 1280
  height: 720
eye:
  ear_threshold: 0.22
"""
    test_yaml = tmp_path / "test_config.yaml"
    test_yaml.write_text(yaml_content, encoding="utf-8")

    cfg = load_config(str(test_yaml))
    assert cfg.server.port == 8080
    assert cfg.camera.device_id == 1
    assert cfg.eye.ear_threshold == 0.22


def test_model_points_shape():
    cfg = AppConfig()
    pts = cfg.headpose.get_model_points_array()
    assert pts.shape == (6, 3)
    indices = cfg.headpose.get_keypoint_indices_list()
    assert len(indices) == 6
