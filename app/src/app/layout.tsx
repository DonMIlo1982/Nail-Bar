import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spoilt Brat",
  description: "Staff dashboard for Spoilt Brat Nail Bar & Blowdry Bar",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
