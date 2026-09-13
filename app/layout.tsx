import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { getTheme } from "@/lib/theme";
import { ThemeProvider } from "./theme-context";
import { ToastProvider } from "@/components/Toast";
import { DemoBar } from "@/components/DemoBar";
import { ApiLogPanel } from "@/components/ApiLogPanel";
import { ThemeSync } from "@/components/ThemeSync";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "United MileagePlus × ClarityPay — Prototype",
  description:
    "Walkable prototype: white-labeled loyalty layer on point-of-sale financing",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeId = cookieStore.get("cp_theme")?.value ?? "united";
  const theme = getTheme(themeId);

  return (
    <html
      lang="en"
      style={
        {
          "--brand": theme.colors.brand,
          "--brand-dark": theme.colors.brandDark,
          "--accent": theme.colors.accent,
        } as React.CSSProperties
      }
    >
      <body>
        <ThemeProvider theme={theme}>
          <ToastProvider>
            <Suspense fallback={null}>
              <ThemeSync activeThemeId={theme.merchantId} />
            </Suspense>
            <DemoBar />
            <div className="api-panel-offset">{children}</div>
            <ApiLogPanel />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
