"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Product } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { STORE_ID } from "@/lib/tenant";

const REORDER_POINT = 5;
const REORDER_TARGET = 20;

export default function PurchaseOrderPanel({
  products,
}: {
  products: Product[];
}) {
  const { t } = useI18n();
  const [generating, setGenerating] = useState(false);

  const lowStock = useMemo(
    () =>
      products
        .filter((p) => (Number(p.stock) || 0) < REORDER_POINT)
        .map((p) => {
          const stock = Number(p.stock) || 0;
          return {
            id: p.id,
            name: p.name,
            stock,
            suggested: Math.max(REORDER_TARGET - stock, 0),
            price: Number(p.price) || 0,
          };
        })
        .sort((a, b) => a.stock - b.stock),
    [products]
  );

  async function handleGenerate() {
    if (lowStock.length === 0) return;
    setGenerating(true);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(t("poDocTitle"), 40, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`StoreFlow  /  ${t("storeBadge", { id: STORE_ID })}`, 40, 62);
    doc.text(
      `PO-${new Date().toISOString().slice(0, 10)}-${Date.now()
        .toString()
        .slice(-4)}`,
      40,
      76
    );
    doc.text(new Date().toLocaleString(), 40, 90);
    doc.setTextColor(0);

    const rows = lowStock.map((item, index) => [
      String(index + 1),
      item.name,
      String(item.stock),
      String(item.suggested),
      formatUsd(item.price * 0.6),
      formatUsd(item.suggested * item.price),
    ]);

    autoTable(doc, {
      startY: 110,
      head: [["#", "Item", "Current Stock", "Order Qty", "Est. Unit Cost", "Line Total"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    const total = lowStock.reduce((sum, i) => sum + i.suggested * i.price, 0);
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      `Total: ${formatUsd(total)}`,
      40,
      finalY + 28,
      { align: "left" }
    );
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.setFont("helvetica", "normal");
    doc.text("Expected delivery: TBD", 40, finalY + 46);

    doc.save(`storeflow-purchase-order-${new Date().toISOString().slice(0, 10)}.pdf`);
    setGenerating(false);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FileText className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold text-gray-900">{t("poTitle")}</h3>
        <span className="ms-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {lowStock.length}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{t("poSub")}</p>

      {lowStock.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 py-8 text-sm text-gray-400">
          {t("poNoLowStock")}
        </div>
      ) : (
        <div className="mt-4 mb-4 flex-1 space-y-2 overflow-y-auto">
          {lowStock.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500">
                  {item.stock} in stock &middot; {t("poTarget", { target: REORDER_TARGET })}
                </p>
              </div>
              <span className="ml-2 shrink-0 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                +{item.suggested}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={lowStock.length === 0 || generating}
        className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FileText className="h-4 w-4" />
        {generating ? t("poGenerating") : t("poGenerate")}
      </button>
    </div>
  );
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatUsd(value: number) {
  return usdFormatter.format(Math.round(value * 100) / 100);
}