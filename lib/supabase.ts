import { createClient } from "@supabase/supabase-js";
import { mockDb } from "./mock-store";

class MockQueryBuilder implements PromiseLike<any> {
  private tableName: string;
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private selectedColumns: string = "*";
  private selectOptions?: { count?: "exact" | "planned" | "estimated"; head?: boolean };
  private filters: Array<(row: any) => boolean> = [];
  private orderConfig?: { column: string; ascending: boolean };
  private limitCount?: number;
  private mutationPayload: any = null;
  private upsertConflict?: string;
  private insertedRows: any[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.action !== "insert") {
      this.action = "select";
    }
    this.selectedColumns = columns;
    this.selectOptions = options;
    return this;
  }

  insert(values: any | any[]) {
    this.action = "insert";
    const table = mockDb.getTable(this.tableName);
    const rows = Array.isArray(values) ? values : [values];

    let maxId = table.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
    this.insertedRows = rows.map((r) => {
      const rowCopy = { ...r };
      if (rowCopy.id === undefined) {
        rowCopy.id = ++maxId;
      }
      if (!rowCopy.created_at) {
        rowCopy.created_at = new Date().toISOString();
      }
      return rowCopy;
    });

    table.push(...this.insertedRows);
    return this;
  }

  update(patch: any) {
    this.action = "update";
    this.mutationPayload = patch;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string }) {
    this.action = "upsert";
    this.upsertConflict = options?.onConflict;
    const table = mockDb.getTable(this.tableName);
    const rows = Array.isArray(values) ? values : [values];

    const conflictKeys = this.upsertConflict
      ? this.upsertConflict.split(",").map((k) => k.trim())
      : ["id"];

    let maxId = table.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);

    for (const row of rows) {
      const existingIndex = table.findIndex((r) =>
        conflictKeys.every((k) => String(r[k]) === String(row[k]))
      );

      if (existingIndex >= 0) {
        table[existingIndex] = { ...table[existingIndex], ...row };
      } else {
        const newRow = { ...row };
        if (newRow.id === undefined) {
          newRow.id = ++maxId;
        }
        if (!newRow.created_at) {
          newRow.created_at = new Date().toISOString();
        }
        table.push(newRow);
      }
    }

    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => {
      if (row[column] === undefined && value === null) return true;
      return String(row[column]) === String(value);
    });
    return this;
  }

  in(column: string, values: any[]) {
    const set = new Set(values.map((v) => String(v)));
    this.filters.push((row) => set.has(String(row[column])));
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((row) => {
      const val = row[column];
      if (val === undefined || val === null) return false;
      return new Date(val).getTime() <= new Date(value).getTime() || val <= value;
    });
    return this;
  }

  order(column: string, config: { ascending?: boolean } = {}) {
    this.orderConfig = {
      column,
      ascending: config.ascending !== false,
    };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private execute(): { data: any; error: any; count?: number } {
    const table = mockDb.getTable(this.tableName);

    if (this.action === "insert") {
      const data = this.insertedRows.length === 1 ? this.insertedRows[0] : this.insertedRows;
      return { data, error: null };
    }

    if (this.action === "update") {
      let updatedCount = 0;
      for (let i = 0; i < table.length; i++) {
        if (this.filters.every((f) => f(table[i]))) {
          table[i] = { ...table[i], ...this.mutationPayload };
          updatedCount++;
        }
      }
      return { data: null, error: null, count: updatedCount };
    }

    if (this.action === "delete") {
      const remaining: any[] = [];
      let deletedCount = 0;
      for (let i = 0; i < table.length; i++) {
        if (this.filters.every((f) => f(table[i]))) {
          deletedCount++;
        } else {
          remaining.push(table[i]);
        }
      }
      (mockDb.data as any)[this.tableName] = remaining;
      return { data: null, error: null, count: deletedCount };
    }

    // Default: Select
    let result = table.filter((row) => this.filters.every((f) => f(row)));

    const totalCount = result.length;

    // Joins for stock_transfers if requested
    if (this.tableName === "stock_transfers") {
      const products = mockDb.getTable("products");
      const warehouses = mockDb.getTable("warehouses");
      result = result.map((t) => {
        const prod = products.find((p) => Number(p.id) === Number(t.product_id));
        const fromW = warehouses.find((w) => Number(w.id) === Number(t.from_warehouse_id));
        const toW = warehouses.find((w) => Number(w.id) === Number(t.to_warehouse_id));
        return {
          ...t,
          product: prod ? { name: prod.name } : undefined,
          from_warehouse: fromW ? { name: fromW.name } : undefined,
          to_warehouse: toW ? { name: toW.name } : undefined,
        };
      });
    }

    if (this.orderConfig) {
      const { column, ascending } = this.orderConfig;
      result.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return ascending ? 1 : -1;
        if (valB === null || valB === undefined) return ascending ? -1 : 1;
        if (typeof valA === "number" && typeof valB === "number") {
          return ascending ? valA - valB : valB - valA;
        }
        if (typeof valA === "boolean" && typeof valB === "boolean") {
          return ascending ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        return ascending
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }

    if (this.selectOptions?.head) {
      return { data: null, error: null, count: totalCount };
    }

    return {
      data: JSON.parse(JSON.stringify(result)),
      error: null,
      count: totalCount,
    };
  }

  async single() {
    if (this.action === "insert" && this.insertedRows.length > 0) {
      return { data: this.insertedRows[0], error: null };
    }
    const res = this.execute();
    if (Array.isArray(res.data)) {
      if (res.data.length === 0) {
        return { data: null, error: new Error("Row not found") };
      }
      return { data: res.data[0], error: null };
    }
    return res;
  }

  async maybeSingle() {
    if (this.action === "insert" && this.insertedRows.length > 0) {
      return { data: this.insertedRows[0], error: null };
    }
    const res = this.execute();
    if (Array.isArray(res.data)) {
      return { data: res.data[0] ?? null, error: null };
    }
    return res;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const res = this.execute();
      return Promise.resolve(res).then(onfulfilled, onrejected);
    } catch (err) {
      if (onrejected) {
        return Promise.reject(err).catch(onrejected);
      }
      return Promise.reject(err);
    }
  }
}

const mockSupabase = {
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
};

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key && (url.startsWith("http://") || url.startsWith("https://"))) {
    try {
      return createClient(url, key);
    } catch (err) {
      console.warn("[StoreFlow] Failed to initialize Supabase client, falling back to mock database:", err);
    }
  }

  return mockSupabase as any;
}

export const supabase = createSupabaseClient();
