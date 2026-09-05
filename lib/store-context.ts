import { getProducts, getSales } from "@/lib/db";
import { aggregateMonthly } from "@/lib/analytics";
import { STORE_ID } from "@/lib/tenant";

const toNum = (value: unknown) => Number(value ?? 0);
const round2 = (value: number) => Math.round(value * 100) / 100;

export interface StoreContext {
  storeId: number;
  totalProducts: number;
  totalStockUnits: number;
  totalStockValue: number;
  lowStockCount: number;
  lowStockProducts: { name: string; stock: number }[];
  soldOutCount: number;
  topProducts: { name: string; revenue: number; stock: number }[];
  totalRevenue: number;
  totalProfit: number;
  profitMarginPct: number;
  monthly: ReturnType<typeof aggregateMonthly>;
  lastSaleAt: string | null;
}

export async function buildStoreContext(
  storeId = STORE_ID
): Promise<StoreContext> {
  const [products, sales] = await Promise.all([
    getProducts(storeId),
    getSales(storeId),
  ]);

  const revenueByProduct = new Map<number, number>();
  for (const sale of sales) {
    if (sale.product_id == null) continue;
    const revenue = toNum(sale.quantity) * toNum(sale.unit_price);
    revenueByProduct.set(
      sale.product_id,
      (revenueByProduct.get(sale.product_id) ?? 0) + revenue
    );
  }

  let totalRevenue = 0;
  let totalProfit = 0;
  let lastSaleAt: string | null = null;
  for (const sale of sales) {
    const revenue = toNum(sale.quantity) * toNum(sale.unit_price);
    const profit =
      toNum(sale.quantity) * (toNum(sale.unit_price) - toNum(sale.unit_cost));
    totalRevenue += revenue;
    totalProfit += profit;
    if (!lastSaleAt || new Date(sale.sold_at) > new Date(lastSaleAt)) {
      lastSaleAt = sale.sold_at;
    }
  }

  const topProducts = products
    .map((p) => ({
      name: p.name,
      revenue: round2(revenueByProduct.get(p.id) ?? 0),
      stock: toNum(p.stock),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStockProducts = products
    .filter((p) => toNum(p.stock) < 5)
    .map((p) => ({ name: p.name, stock: toNum(p.stock) }));

  return {
    storeId,
    totalProducts: products.length,
    totalStockUnits: products.reduce((sum, p) => sum + toNum(p.stock), 0),
    totalStockValue: round2(
      products.reduce((sum, p) => sum + toNum(p.price) * toNum(p.stock), 0)
    ),
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
    soldOutCount: products.filter((p) => toNum(p.stock) === 0).length,
    topProducts,
    totalRevenue: round2(totalRevenue),
    totalProfit: round2(totalProfit),
    profitMarginPct:
      totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0,
    monthly: aggregateMonthly(sales),
    lastSaleAt,
  };
}