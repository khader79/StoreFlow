"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type Locale } from "@/lib/i18n";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { STORE_ID } from "@/lib/tenant";

const navLinks: Array<{ href: string; key: "navDashboard" | "navPos" | "navSettings"; exact?: boolean }> = [
  { href: "/", key: "navDashboard", exact: true },
  { href: "/pos", key: "navPos" },
  { href: "/settings", key: "navSettings" },
];

export default function AppHeader() {
  const { t, locale, setLocale, currency, setCurrency } = useI18n();
  const pathname = usePathname();

  const isActive = (link: (typeof navLinks)[number]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            S
          </span>
          <span className="text-base font-bold tracking-tight text-gray-900">
            {t("appName")}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            aria-label="Currency"
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>

          <div
            className="flex h-9 items-center overflow-hidden rounded-lg border border-gray-300 bg-white text-sm"
            role="group"
            aria-label="Language"
          >
            {(["en", "ar"] as Locale[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`h-full px-3 font-medium transition-colors ${
                  locale === code
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {code === "en" ? "EN" : "عربي"}
              </button>
            ))}
          </div>

          <span className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t("storeBadge", { id: STORE_ID })}
          </span>
        </div>
      </div>
    </header>
  );
}