import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI CRM Pro — Intelligent Lead Management",
  description:
    "AI-powered CRM with distributor management, voice agent, and automated lead routing. Built for modern sales teams.",
  keywords: ["CRM", "AI", "Lead Management", "Distributors", "Sales"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
