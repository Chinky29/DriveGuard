import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly title?: string;
}

export function Card({ children, title, className = "", ...props }: CardProps) {
  return (
    <div
      className={`glass-panel rounded-xl p-5 shadow-xl border border-slate-800/80 bg-slate-900/60 ${className}`}
      {...props}
    >
      {title && (
        <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-3 font-mono">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
