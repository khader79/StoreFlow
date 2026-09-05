"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAiRecommendations,
  markRecommendationRead,
  type AiRecommendation,
} from "@/lib/ai-recommendations";
import { STORE_ID } from "@/lib/tenant";
import { useI18n, type DictKey } from "@/lib/i18n";

const PRIORITY_STYLES: Record<AiRecommendation["priority"], string> = {
  high: "border-red-200 bg-red-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-blue-100 bg-blue-50",
};

const PRIORITY_BADGE: Record<AiRecommendation["priority"], string> = {
  high: "bg-red-600 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-blue-500 text-white",
};

const PRIORITY_KEY: Record<AiRecommendation["priority"], DictKey> = {
  high: "alertHigh",
  medium: "alertMedium",
  low: "alertLow",
};

export default function AIAlerts({
  storeId = STORE_ID,
}: {
  storeId?: number;
}) {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAiRecommendations(storeId)
      .then(setAlerts)
      .catch((err) => {
        if (err instanceof Error && /does not exist|must not exist/i.test(err.message)) {
          setAlerts([]);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load alerts.");
        }
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  const unread = useMemo(() => alerts.filter((a) => !a.is_read).length, [alerts]);

  async function dismiss(id: number) {
    try {
      await markRecommendationRead(id, true);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      );
    } catch {
      /* ignore */
    }
  }

  const visible = alerts.slice(0, 6);

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("alertsTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">{t("alertsSub")}</p>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            {t("alertsUnread", { count: unread })}
          </span>
        )}
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">
            {t("loadingAnalytics")}
          </p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-red-500">{error}</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            {t("alertsEmpty")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visible.map((alert) => (
              <li
                key={alert.id}
                className={`flex flex-col rounded-lg border p-4 ${
                  PRIORITY_STYLES[alert.priority]
                } ${alert.is_read ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        PRIORITY_BADGE[alert.priority]
                      }`}
                    >
                      {t(PRIORITY_KEY[alert.priority])}
                    </span>
                    <span className="ms-2 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {alert.category}
                    </span>
                  </div>
                  {!alert.is_read && (
                    <button
                      type="button"
                      onClick={() => dismiss(alert.id)}
                      className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-50"
                    >
                      {t("alertsMarkRead")}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {alert.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {alert.message}
                </p>
                <p className="mt-2 text-[11px] text-gray-400">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}