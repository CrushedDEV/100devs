"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EventStats } from "@/server/services/stats";

const AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const STATUS_COLORS: Record<string, string> = {
  scheduled: "var(--chart-2)",
  in_progress: "var(--chart-1)",
  completed: "var(--chart-3)",
  delayed: "var(--chart-4)",
  missed: "var(--chart-5)",
  cancelled: "var(--muted-foreground)",
};

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
      contentStyle={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontSize: 12,
        color: "var(--popover-foreground)",
      }}
      labelStyle={{ color: "var(--muted-foreground)" }}
    />
  );
}

/** Deliveries over time — the clearest signal of the event's rhythm. */
export function CheckpointsChart({
  data,
}: {
  data: EventStats["checkpointsPerDay"];
}) {
  if (!data.length) return <NoData />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="checkpointsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis allowDecimals={false} {...AXIS_PROPS} />
        {ChartTooltip()}
        <Area
          type="monotone"
          dataKey="count"
          name="Checkpoints"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#checkpointsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TeamProgressChart({
  data,
}: {
  data: EventStats["teamProgress"];
}) {
  if (!data.length) return <NoData />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 30)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
      >
        <XAxis type="number" domain={[0, 100]} unit="%" {...AXIS_PROPS} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          {...AXIS_PROPS}
        />
        {ChartTooltip()}
        <Bar dataKey="progress" name="Progreso" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((entry) => (
            <Cell key={entry.teamId} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ShiftStatusChart({
  data,
}: {
  data: EventStats["statusBreakdown"];
}) {
  if (!data.length) return <NoData />;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="max-w-56">
        <PieChart>
          {ChartTooltip()}
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "var(--chart-2)"}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <ul className="flex-1 space-y-1.5">
        {data.map((entry) => (
          <li
            key={entry.status}
            className="flex items-center gap-2 text-sm"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[entry.status] ?? "var(--chart-2)",
              }}
            />
            <span className="flex-1 text-muted-foreground">{entry.label}</span>
            <span className="font-medium tabular-nums">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoData() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Sin datos suficientes todavía.
    </div>
  );
}
