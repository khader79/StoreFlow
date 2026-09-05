"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { STORE_ID } from "@/lib/tenant";
import { useI18n } from "@/lib/i18n";

interface AnalystResult {
  summary: string;
  highlight: { label: string; value: string };
  metrics: {
    label: string;
    value: string;
    trend: "up" | "down" | "flat";
  }[];
  insights: string[];
  recommendations: { title: string; action: string }[];
}

const examplePrompts = [
  "Which products are at risk of running out of stock?",
  "What should I reorder this month?",
  "How is this month trending against the last three?",
  "Which products give me the best profit margins?",
];

export default function AnalystPanel({ storeId = STORE_ID }) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<AnalystResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, storeId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Analysis failed.");
      }
      setResult((await res.json()) as AnalystResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Sparkles className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold text-gray-900">
          {t("analystTitle")}
        </h3>
        <span className="ms-auto rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
          {t("analystBadge")}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{t("analystSub")}</p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder={t("analystPlaceholder")}
        className="mt-3 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {examplePrompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrompt(p)}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            {p}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        {loading ? t("analyzing") : t("analyze")}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {t("errorPrefix")}: {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4 overflow-y-auto">
          <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
            <p className="text-sm leading-relaxed text-gray-800">
              {result.summary}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-md bg-white px-4 py-2">
              <span className="text-xs font-medium text-gray-500">
                {result.highlight.label}
              </span>
              <span className="text-lg font-bold text-violet-700">
                {result.highlight.value}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {result.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <p className="truncate text-[11px] text-gray-500">{m.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {m.value}
                </p>
                <TrendPill trend={m.trend} />
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("insights")}
            </h4>
            <ul className="space-y-1.5">
              {result.insights.map((insight, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-gray-700"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t("recommendations")}
            </h4>
            <div className="space-y-2">
              {result.recommendations.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {r.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">{r.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendPill({ trend }: { trend: AnalystResult["metrics"][number]["trend"] }) {
  const styles: Record<typeof trend, string> = {
    up: "bg-emerald-100 text-emerald-700",
    down: "bg-red-100 text-red-700",
    flat: "bg-slate-100 text-slate-600",
  };
  const arrows: Record<typeof trend, string> = {
    up: "\u2191",
    down: "\u2193",
    flat: "\u2192",
  };
  return (
    <span
      className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles[trend]}`}
    >
      {arrows[trend]} {trend}
    </span>
  );
}