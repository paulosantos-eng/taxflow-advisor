import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "TaxFlow Advisor — Tax-aware portfolio management",
  description: "Gestão de carteira ciente de imposto para consultores brasileiros",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Sidebar />
        <main className="ml-60 min-h-screen">
          <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
