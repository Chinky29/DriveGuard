"use client";

import React, { useMemo } from "react";

export interface ScorePoint {
  readonly time: string; // e.g. "14:21"
  readonly score: number;
}

export interface SparklineChartProps {
  readonly history: readonly ScorePoint[];
  readonly height?: number;
}

export function SparklineChart({ history, height = 70 }: SparklineChartProps) {
  // Ensure we have at least 2 points to draw
  const points = useMemo(() => {
    if (history.length === 0) {
      return [
        { time: "0", score: 0 },
        { time: "1", score: 0 },
      ];
    }
    if (history.length === 1) {
      return [history[0], history[0]];
    }
    // Take the last 60 points (10 minutes if sampled every 10s)
    return history.slice(-60);
  }, [history]);

  const width = 300;
  const paddingY = 8;
  const chartHeight = height - paddingY * 2;

  // Build SVG polyline points
  const svgPoints = useMemo(() => {
    const minX = 0;
    const maxX = points.length - 1;

    return points
      .map((p, index) => {
        const x = (index / maxX) * width;
        // Score 0 is at bottom (height - paddingY), score 100 is at top (paddingY)
        const y = paddingY + chartHeight - (Math.max(0, Math.min(100, p.score)) / 100) * chartHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points, width, chartHeight, paddingY]);

  const areaPoints = useMemo(() => {
    return `0,${height} ${svgPoints} ${width},${height}`;
  }, [svgPoints, height, width]);

  // Coordinates for threshold lines (40 = notice, 65 = warning)
  const noticeY = paddingY + chartHeight - (40 / 100) * chartHeight;
  const warningY = paddingY + chartHeight - (65 / 100) * chartHeight;

  const currentScore = points[points.length - 1]?.score ?? 0;
  const peakScore = Math.max(...points.map((p) => p.score), 0);

  return (
    <div className="w-full bg-[#14161f] border border-[#262936] rounded-xl p-3 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
          10-Minute Trend
        </span>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-400">
            Peak: <strong className="text-white">{peakScore}</strong>
          </span>
          <span className="text-slate-400">
            Current:{" "}
            <strong
              className={
                currentScore >= 65
                  ? "text-red-400"
                  : currentScore >= 40
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
            >
              {currentScore}
            </strong>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="score-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ECC71" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2ECC71" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference Line: Warning (65) */}
          <line
            x1="0"
            y1={warningY}
            x2={width}
            y2={warningY}
            stroke="#E67E22"
            strokeDasharray="3 3"
            strokeWidth="0.8"
            opacity="0.4"
          />

          {/* Reference Line: Notice (40) */}
          <line
            x1="0"
            y1={noticeY}
            x2={width}
            y2={noticeY}
            stroke="#F1C40F"
            strokeDasharray="3 3"
            strokeWidth="0.8"
            opacity="0.4"
          />

          {/* Area fill */}
          <polygon points={areaPoints} fill="url(#score-gradient)" />

          {/* Sparkline stroke */}
          <polyline
            fill="none"
            stroke="#2ECC71"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={svgPoints}
          />
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-[#262936]">
        <span>-10m</span>
        <span>-5m</span>
        <span>Now</span>
      </div>
    </div>
  );
}
