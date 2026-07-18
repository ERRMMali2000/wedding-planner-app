import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roshan & Priyanka — Wedding Planner",
  description: "Our wedding planning dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
