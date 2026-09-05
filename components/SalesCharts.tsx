"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyMetric } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";

function compactMoney(value: number, money: (v: number) => string) {
  if (Math.abs(value) < 1000) return money(value);
  const symbol = money(1).replace(/[\d.,\s\u0660-\u0669\u06F0-\u06F9]+/g, "").trim();
  return `${symbol}${(value / 1000).toFixed(1)}k`;
}

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  fontSize: "0.8rem",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export default function SalesCharts({ data }: { data: MonthlyMetric[] }) {
  const { t, money, dir } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title={t("chartRevenue")} subtitle={t("chartRevenueSub")}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              reversed={dir === "rtl"}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => compactMoney(v, money)}
              width={64}
              orientation={dir === "rtl" ? "right" : "left"}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => money(value)}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name={t("statStockValue")}
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("chartMargin")} subtitle={t("chartMarginSub")}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              reversed={dir === "rtl"}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={64}
              orientation={dir === "rtl" ? "right" : "left"}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => `${value}%`}
            />
            <Line
              type="monotone"
              dataKey="margin"
              name={t("chartMargin")}
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 3, fill: "#059669" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}