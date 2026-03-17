import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Virus Online",
  description: "Wieloosobowa przegladarkowa wersja gry Virus",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
