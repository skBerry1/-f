import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import Nav from "@/components/Nav";
import TelegramAuth from "@/components/TelegramAuth";
import { StarIcon } from "@/components/icons";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Star Gifts — маркет подарков",
  description: "Покупай, прокачивай и обменивай подарки за звёзды",
};

export const viewport: Viewport = {
  themeColor: "#0B0C14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="ru" className={manrope.variable}>
      <body className="font-sans">
        {/* Telegram WebApp SDK — для initData-авторизации внутри Mini App */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <TelegramAuth authed={Boolean(user)} />

        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6">
          <header className="sticky top-0 z-40 -mx-4 mb-2 border-b border-white/[0.06] bg-ink-950/70 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <a href="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet text-sm shadow-glow">
                  ⭐
                </span>
                <span className="text-[17px] font-extrabold tracking-[-0.02em]">
                  Star Gifts
                </span>
              </a>
              <div className="flex items-center gap-3">
                {user ? (
                  <div className="glass flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold">
                    <StarIcon className="h-4 w-4 text-accent-gold" />
                    <span>{user.stars.toLocaleString("ru-RU")}</span>
                  </div>
                ) : (
                  <span className="text-xs text-white/40">не авторизован</span>
                )}
              </div>
            </div>
            {/* Десктоп-навигация в шапке */}
            <div className="mt-2 hidden md:block">
              <Nav variant="top" />
            </div>
          </header>

          <main className="flex-1 pb-28 pt-2 md:pb-10">{children}</main>
        </div>

        {/* Мобильная нижняя таб-навигация */}
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
          <Nav variant="bottom" />
        </div>
      </body>
    </html>
  );
}
