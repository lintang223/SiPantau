import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiPantau — Kementerian Kehutanan RI",
  description: "Sistem Pantau Informasi Market KLHK RI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}