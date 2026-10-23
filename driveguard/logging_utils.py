"""Logging utilities for DriveGuard.

Configures standard logging and structured event logging to CSV.
Strictly adheres to Privacy Rule: never writes or saves raw frames.
"""

import csv
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Optional
from driveguard.config import LoggingConfig


def setup_logger(config: LoggingConfig) -> logging.Logger:
    """Set up and return the application root logger."""
    logger = logging.getLogger("driveguard")
    level = getattr(logging, config.level.upper(), logging.INFO)
    logger.setLevel(level)

    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(level)
    logger.addHandler(console_handler)

    if config.log_to_file:
        file_handler = logging.FileHandler(config.log_file, encoding="utf-8")
        file_handler.setFormatter(formatter)
        file_handler.setLevel(level)
        logger.addHandler(file_handler)

    return logger


class EventLogger:
    """Logs advisory transitions and telemetry to a CSV file for audit/replay."""

    HEADERS = [
        "timestamp_iso",
        "timestamp_epoch",
        "frame_id",
        "advisory_level",
        "advisory_reason",
        "face_detected",
        "avg_ear",
        "perclos",
        "eye_closed_sec",
        "yaw_deg",
        "pitch_deg",
        "roll_deg",
        "head_deviated_sec",
        "fps",
    ]

    def __init__(self, csv_filepath: str):
        self.csv_filepath = csv_filepath
        self._ensure_header()

    def _ensure_header(self) -> None:
        file_exists = os.path.exists(self.csv_filepath) and os.path.getsize(self.csv_filepath) > 0
        if not file_exists:
            dir_name = os.path.dirname(self.csv_filepath)
            if dir_name:
                os.makedirs(dir_name, exist_ok=True)
            with open(self.csv_filepath, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(self.HEADERS)

    def log_event(
        self,
        frame_id: int,
        timestamp_epoch: float,
        advisory_level: str,
        advisory_reason: str,
        face_detected: bool,
        avg_ear: float,
        perclos: Optional[float],
        eye_closed_sec: float,
        yaw_deg: float,
        pitch_deg: float,
        roll_deg: float,
        head_deviated_sec: float,
        fps: float,
    ) -> None:
        """Write an advisory telemetry row to the CSV log."""
        iso_str = datetime.fromtimestamp(timestamp_epoch, tz=timezone.utc).isoformat()
        perclos_val = f"{perclos:.4f}" if perclos is not None else ""
        row = [
            iso_str,
            f"{timestamp_epoch:.4f}",
            frame_id,
            advisory_level,
            advisory_reason,
            1 if face_detected else 0,
            f"{avg_ear:.4f}",
            perclos_val,
            f"{eye_closed_sec:.2f}",
            f"{yaw_deg:.2f}",
            f"{pitch_deg:.2f}",
            f"{roll_deg:.2f}",
            f"{head_deviated_sec:.2f}",
            f"{fps:.1f}",
        ]
        try:
            with open(self.csv_filepath, mode="a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(row)
        except Exception as e:
            logging.getLogger("driveguard").error("Failed to write to event log: %s", e)
