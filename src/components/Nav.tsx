"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CatalogIcon,
  BagIcon,
  MarketIcon,
  CaseIcon,
  UserIcon,
} from "./icons";

const TABS = [
  { href: "/", label: "Каталог", Icon: CatalogIcon },
  { href: "/inventory", label: "Инвентарь", Icon: BagIcon },
  { href: "/market", label: "Маркет", Icon: MarketIcon },
  { href: "/cases", label: "Кейсы", Icon: CaseIcon },
  { href: "/profile", label: "Профиль", Icon: UserIcon },
];

export default function Nav({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (variant === "top") {
    return (
      <nav className="flex gap-1">
        {TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
              isActive(href)
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      className="border-t border-white/[0.08] bg-ink-900/85 backdrop-blur-xl"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5"
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-all ${
                  active
                    ? "bg-gradient-to-r from-accent-blue/25 to-accent-violet/25 text-accent-blue"
                    : "text-white/40"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-white" : "text-white/40"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
