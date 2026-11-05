import React from 'react';

interface SparklineProps {
  values: number[];
  color: string;
  /** Unique id for the gradient fill. */
  id: string;
  width?: number;
}

/** Area sparkline scaled to the largest value; a flat line when there is no data. */
export const Sparkline: React.FC<SparklineProps> = ({ values, color, id, width = 250 }) => {
  const height = 45;
  const series = values.length >= 2 ? values : [values[0] ?? 0, values[0] ?? 0];
  const max = Math.max(...series, 1);
  const points = series.map((v, i) => {
    const x = (i * (width - 4)) / (series.length - 1);
    const y = height - 4 - (v / max) * (height - 14);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x},${y}`).join(' ');
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${lastX},${height} L 0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  );
};
