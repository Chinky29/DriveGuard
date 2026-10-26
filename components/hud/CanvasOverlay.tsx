"use client";

import React, { useRef } from "react";
import { DriverStateSnapshot } from "@/lib/types";

export interface CanvasOverlayProps {
  readonly snapshot?: DriverStateSnapshot | null;
  readonly width?: number;
  readonly height?: number;
}

/**
 * CanvasOverlay Component
 *
 * TODO: High-contrast HUD renderer drawing 3D pose axes (X=Red, Y=Green, Z=Blue)
 * and eye contour points onto an HTML5 overlay canvas.
 */
export function CanvasOverlay({ width = 640, height = 480 }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
}
