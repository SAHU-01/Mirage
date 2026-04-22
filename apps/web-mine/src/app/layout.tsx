import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirage — Anti-Adversarial Copy-Trading Intelligence",
  description:
    "Every other tool tells you who's winning. Mirage tells you who's cheating.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
