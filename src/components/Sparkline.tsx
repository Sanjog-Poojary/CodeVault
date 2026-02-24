'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';

interface SparklineProps {
  data: Array<{ value: number; date?: string }>;
  positive?: boolean;
  height?: number;
}

export default function Sparkline({ data, positive = true, height = 40 }: SparklineProps) {
  const color = positive ? '#10B981' : '#EF4444';
  const gradientId = `sparkline-gradient-${positive ? 'pos' : 'neg'}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={color}
              stopOpacity={0.08}
            />
            <stop
              offset="100%"
              stopColor={color}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={600}
          animationEasing="ease-out"
        />
        <Tooltip
          content={() => null}
          cursor={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
