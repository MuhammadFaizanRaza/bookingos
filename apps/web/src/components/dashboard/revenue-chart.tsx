'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function RevenueChart({
  data,
}: {
  data: { date: string; revenue: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 13,
          }}
          formatter={(v: number) => [`$${v}`, 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#7C3AED"
          strokeWidth={2.5}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
