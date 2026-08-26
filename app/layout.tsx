import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Resume Lab",
  description: "Privacy-first, explainable candidate matching and evaluation"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
