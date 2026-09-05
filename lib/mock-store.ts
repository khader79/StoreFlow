// In-memory mock database store for StoreFlow
// Used when Supabase credentials are not configured or offline

export interface MockStoreData {
  stores: Array<any>;
  warehouses: Array<any>;
  products: Array<any>;
  inventory: Array<any>;
  stock_transfers: Array<any>;
  sales: Array<any>;
  audit_logs: Array<any>;
  ai_recommendations: Array<any>;
}

function generateInitialSales(products: Array<{ id: number; price: number }>) {
  const sales: Array<any> = [];
  let saleId = 1;
  const now = Date.now();
  const DAY_MS = 86400000;

  // Generate ~180 days of realistic sales data
  for (let d = 180; d >= 0; d--) {
    const dayDate = new Date(now - d * DAY_MS);
    // 1 to 4 sales per day
    const salesCount = 1 + ((d * 7 + 3) % 4);
    for (let s = 0; s < salesCount; s++) {
      const prod = products[(d + s * 3) % products.length];
      if (!prod) continue;
      const qty = 1 + ((d + s) % 5);
      const unitPrice = Math.round(prod.price * (0.95 + ((d % 10) / 100)) * 100) / 100;
      const unitCost = Math.round(prod.price * 0.58 * 100) / 100;
      sales.push({
        id: saleId++,
        store_id: 1,
        product_id: prod.id,
        sold_at: new Date(dayDate.getTime() + s * 3600000 * 3).toISOString(),
        quantity: qty,
        unit_price: unitPrice,
        unit_cost: unitCost,
        client_op_id: null,
      });
    }
  }
  return sales;
}

const initialProducts = [
  { id: 1, store_id: 1, name: "Artisan Coffee Beans (1kg)", price: 24.50, stock: 45, warehouse_id: 1, created_at: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: 2, store_id: 1, name: "Ceramic Drip Mug 350ml", price: 18.00, stock: 22, warehouse_id: 1, created_at: new Date(Date.now() - 110 * 86400000).toISOString() },
  { id: 3, store_id: 1, name: "Organic Matcha Powder 100g", price: 29.99, stock: 3, warehouse_id: 1, created_at: new Date(Date.now() - 100 * 86400000).toISOString() },
  { id: 4, store_id: 1, name: "French Press Glass 800ml", price: 34.00, stock: 14, warehouse_id: 1, created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: 5, store_id: 1, name: "Paper Filters (100pk)", price: 6.50, stock: 80, warehouse_id: 1, created_at: new Date(Date.now() - 80 * 86400000).toISOString() },
  { id: 6, store_id: 1, name: "Cold Brew Glass Carafe 1L", price: 22.00, stock: 2, warehouse_id: 1, created_at: new Date(Date.now() - 70 * 86400000).toISOString() },
  { id: 7, store_id: 1, name: "Stainless Milk Pitcher 600ml", price: 16.50, stock: 0, warehouse_id: 1, created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 8, store_id: 1, name: "Espresso Tamper Steel 58mm", price: 28.00, stock: 18, warehouse_id: 1, created_at: new Date(Date.now() - 50 * 86400000).toISOString() },
];

const initialInventory = [
  // Main Store (Warehouse 1)
  { id: 1, warehouse_id: 1, product_id: 1, quantity: 45, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 2, warehouse_id: 1, product_id: 2, quantity: 22, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 3, warehouse_id: 1, product_id: 3, quantity: 3, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 4, warehouse_id: 1, product_id: 4, quantity: 14, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 5, warehouse_id: 1, product_id: 5, quantity: 80, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 6, warehouse_id: 1, product_id: 6, quantity: 2, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 7, warehouse_id: 1, product_id: 7, quantity: 0, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 8, warehouse_id: 1, product_id: 8, quantity: 18, reorder_point: 5, updated_at: new Date().toISOString() },
  // Secondary Warehouse (Warehouse 2)
  { id: 9, warehouse_id: 2, product_id: 1, quantity: 30, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 10, warehouse_id: 2, product_id: 2, quantity: 15, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 11, warehouse_id: 2, product_id: 3, quantity: 6, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 12, warehouse_id: 2, product_id: 4, quantity: 10, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 13, warehouse_id: 2, product_id: 5, quantity: 50, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 14, warehouse_id: 2, product_id: 6, quantity: 8, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 15, warehouse_id: 2, product_id: 7, quantity: 12, reorder_point: 5, updated_at: new Date().toISOString() },
  { id: 16, warehouse_id: 2, product_id: 8, quantity: 10, reorder_point: 5, updated_at: new Date().toISOString() },
];

const initialStockTransfers = [
  {
    id: 1,
    store_id: 1,
    product_id: 1,
    from_warehouse_id: 2,
    to_warehouse_id: 1,
    quantity: 15,
    status: "completed",
    note: "Restock front store shelves",
    created_by_user_id: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    product: { name: "Artisan Coffee Beans (1kg)" },
    from_warehouse: { name: "Secondary Warehouse" },
    to_warehouse: { name: "Main Store" },
  },
  {
    id: 2,
    store_id: 1,
    product_id: 4,
    from_warehouse_id: 2,
    to_warehouse_id: 1,
    quantity: 5,
    status: "completed",
    note: "French press shelf display replenishment",
    created_by_user_id: null,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    product: { name: "French Press Glass 800ml" },
    from_warehouse: { name: "Secondary Warehouse" },
    to_warehouse: { name: "Main Store" },
  },
];

const initialRecommendations = [
  {
    id: 1,
    store_id: 1,
    category: "restock" as const,
    title: "Low Stock Alert: Matcha & Cold Brew Carafe",
    message: "Organic Matcha Powder (3 units left) and Cold Brew Carafe (2 units left) are below safety stock threshold.",
    priority: "high" as const,
    data: { product_ids: [3, 6] },
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    store_id: 1,
    category: "pricing" as const,
    title: "Strong Coffee Bean Margin",
    message: "Artisan Coffee Beans is generating high repeat revenue with a healthy 42% margin.",
    priority: "medium" as const,
    data: { product_id: 1 },
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    store_id: 1,
    category: "operational" as const,
    title: "Milk Pitcher Sold Out in Main Store",
    message: "Stainless Milk Pitcher has 0 units in Main Store, but 12 units are available in Secondary Warehouse. Transfer recommended.",
    priority: "medium" as const,
    data: { product_id: 7, from_warehouse_id: 2, to_warehouse_id: 1 },
    is_read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

class MockStore {
  data: MockStoreData = {
    stores: [
      { id: 1, name: "Main Store", created_at: new Date().toISOString() },
    ],
    warehouses: [
      { id: 1, store_id: 1, name: "Main Store", location: "Storefront", is_main: true, created_at: new Date().toISOString() },
      { id: 2, store_id: 1, name: "Secondary Warehouse", location: "Back office", is_main: false, created_at: new Date().toISOString() },
    ],
    products: JSON.parse(JSON.stringify(initialProducts)),
    inventory: JSON.parse(JSON.stringify(initialInventory)),
    stock_transfers: JSON.parse(JSON.stringify(initialStockTransfers)),
    sales: generateInitialSales(initialProducts),
    audit_logs: [
      {
        id: 1,
        store_id: 1,
        user_id: null,
        action: "system_initialized",
        entity_type: "store",
        entity_id: 1,
        old_value: null,
        new_value: { name: "Main Store" },
        metadata: { mode: "in-memory" },
        created_at: new Date().toISOString(),
      },
    ],
    ai_recommendations: JSON.parse(JSON.stringify(initialRecommendations)),
  };

  getTable(name: string): Array<any> {
    if (!(name in this.data)) {
      (this.data as any)[name] = [];
    }
    return (this.data as any)[name];
  }
}

// Global in-memory singleton
const globalForMock = globalThis as unknown as { mockStore?: MockStore };
export const mockDb = globalForMock.mockStore || new MockStore();
if (process.env.NODE_ENV !== "production") globalForMock.mockStore = mockDb;
