import type { Sale } from "@/lib/db";

const toNum = (value: unknown) => Number(value ?? 0);

export interface MonthlyMetric {
  label: string;
  revenue: number;
  profit: number;
  quantity: number;
  margin: number;
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

export function aggregateMonthly(sales: Sale[], months = 6): MonthlyMetric[] {
  const now = new Date();
  const buckets = new Map<
    string,
    { label: string; revenue: number; profit: number; quantity: number }
  >();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      label: monthFormatter.format(d),
      revenue: 0,
      profit: 0,
      quantity: 0,
    });
  }

  for (const sale of sales) {
    const d = new Date(sale.sold_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;

    const q = toNum(sale.quantity);
    bucket.revenue += q * toNum(sale.unit_price);
    bucket.profit += q * (toNum(sale.unit_price) - toNum(sale.unit_cost));
    bucket.quantity += q;
  }

  return Array.from(buckets.values()).map((b) => ({
    label: b.label,
    revenue: Math.round(b.revenue * 100) / 100,
    profit: Math.round(b.profit * 100) / 100,
    quantity: b.quantity,
    margin:
      b.revenue > 0 ? Math.round((b.profit / b.revenue) * 1000) / 10 : 0,
  }));
}