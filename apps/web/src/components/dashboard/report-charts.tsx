'use client';

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 13,
};

const PURPLES = ['#7C3AED', '#9333EA', '#A855F7', '#C026D3', '#D946EF', '#E879F9'];

export function BarReport({
  data,
  color = '#7C3AED',
  horizontal = false,
}: {
  data: { name: string; value: number }[];
  color?: string;
  horizontal?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ left: horizontal ? 8 : -16, right: 8, top: 8 }}
      >
        {horizontal ? (
          <>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={70}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
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
          </>
        )}
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'hsl(var(--muted))' }}
          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
        />
        <Bar dataKey="value" radius={6} fill={color} barSize={28}>
          {data.map((_, i) => (
            <Cell key={i} fill={PURPLES[i % PURPLES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieReport({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
