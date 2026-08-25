import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Resume Lab",
  description: "Private, explainable and local-first resume matching"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
