import type { Metadata } from "next";
import "./globals.css";
import { AnalysisDraftProvider } from "./components/analysis-draft";
import { AppHeader, AppFooter } from "./components/app-header";

export const metadata: Metadata = {
  title: "Open Resume Lab",
  description: "Privacy-first, explainable candidate matching and evaluation"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><a className="skip-link" href="#main-content">Skip to content</a><AnalysisDraftProvider><AppHeader /><div className="app-content">{children}</div><AppFooter /></AnalysisDraftProvider></body>
    </html>
  );
}
